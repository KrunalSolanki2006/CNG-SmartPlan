"""Google Maps service powered by SerpApi for CNG SmartPlan.

Provides:
1. Google Maps Search (CNG station discovery & quarantine storage)
2. Google Maps Autocomplete (candidate site geocoding)
3. Google Maps Place Details (rich metadata, photos, hours, reviews)
4. Google Maps Directions (road routing, Leaflet polylines, detour ratio)
"""

from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Tuple

try:
    from config import settings
    from schemas.maps import (
        AutocompleteResponse,
        AutocompleteSuggestion,
        CandidateStatusUpdateRequest,
        CandidateSummaryResponse,
        DirectionsResponse,
        DirectionsRequest,
        DiscoveredStation,
        GPSCoordinates,
        MapSearchResponse,
        MapsStatusResponse,
        PlaceDetailsRequest,
        PlaceDetailsResponse,
        PlaceReview,
        RouteAlternative,
        RouteStep,
        SetModeRequest,
    )
    from services.geo_service import GeoService
    from services.serpapi_client import serpapi_client
except ImportError:
    from server.config import settings
    from server.schemas.maps import (
        AutocompleteResponse,
        AutocompleteSuggestion,
        CandidateStatusUpdateRequest,
        CandidateSummaryResponse,
        DirectionsResponse,
        DirectionsRequest,
        DiscoveredStation,
        GPSCoordinates,
        MapSearchResponse,
        MapsStatusResponse,
        PlaceDetailsRequest,
        PlaceDetailsResponse,
        PlaceReview,
        RouteAlternative,
        RouteStep,
        SetModeRequest,
    )
    from server.services.geo_service import GeoService
    from server.services.serpapi_client import serpapi_client

logger = logging.getLogger(__name__)


def parse_distance_to_km(dist_val: Any) -> Tuple[float, str]:
    """Parse distance value (numeric meters or string like '14.9 km' or '850 m') to (km_float, formatted_text)."""
    if dist_val is None:
        return 0.0, "0 km"
    if isinstance(dist_val, (int, float)):
        # If numeric, SerpApi directions returns distance in meters when distance_unit=0
        km = float(dist_val) / 1000.0 if dist_val > 100 else float(dist_val)
        return round(km, 2), f"{round(km, 2)} km"

    text = str(dist_val).strip()
    match = re.search(r"([\d\.]+)\s*(km|m)?", text, re.IGNORECASE)
    if match:
        val = float(match.group(1))
        unit = (match.group(2) or "km").lower()
        if unit == "m":
            val = val / 1000.0
        return round(val, 2), text
    return 0.0, text


def parse_duration_to_mins(dur_val: Any) -> Tuple[float, str]:
    """Parse duration value (numeric seconds or string like '46 min' or '1 hr 12 min') to (mins_float, formatted_text)."""
    if dur_val is None:
        return 0.0, "0 min"
    if isinstance(dur_val, (int, float)):
        # Numeric seconds
        mins = float(dur_val) / 60.0
        return round(mins, 1), f"{round(mins)} min"

    text = str(dur_val).strip()
    mins = 0.0
    hr_match = re.search(r"(\d+)\s*(?:hr|hour|hours)", text, re.IGNORECASE)
    if hr_match:
        mins += float(hr_match.group(1)) * 60.0
    min_match = re.search(r"(\d+)\s*(?:min|mins|minute|minutes)", text, re.IGNORECASE)
    if min_match:
        mins += float(min_match.group(1))

    if mins == 0.0:
        # Fallback raw number search
        raw_match = re.search(r"[\d\.]+", text)
        if raw_match:
            mins = float(raw_match.group(0))

    return round(mins, 1), text


class GoogleMapsService:
    """Service encapsulating the 4 SerpApi Google Maps capabilities for CNG SmartPlan."""

    def __init__(self, discoveries_path: Optional[Path] = None):
        self.discoveries_path = discoveries_path or settings.serpapi_discoveries_path
        self.discoveries_path.parent.mkdir(parents=True, exist_ok=True)

    def load_quarantined_discoveries(self) -> List[DiscoveredStation]:
        """Load discovered stations from quarantine storage."""
        if not self.discoveries_path.exists():
            return []
        try:
            with open(self.discoveries_path, "r", encoding="utf-8") as f:
                raw_list = json.load(f)
            return [DiscoveredStation(**item) for item in raw_list]
        except Exception as e:
            logger.warning(f"Could not load discoveries from {self.discoveries_path}: {e}")
            return []

    def save_quarantined_discoveries(self, stations: List[DiscoveredStation]) -> None:
        """Save discovered stations to quarantine storage with deduplication."""
        try:
            existing = self.load_quarantined_discoveries()
            station_map: Dict[str, DiscoveredStation] = {s.id: s for s in existing}
            for s in stations:
                station_map[s.id] = s

            serializable = [s.model_dump() for s in station_map.values()]
            with open(self.discoveries_path, "w", encoding="utf-8") as f:
                json.dump(serializable, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save quarantined discoveries to {self.discoveries_path}: {e}")

    async def search_cng_stations(
        self,
        query: Optional[str] = None,
        center_lat: float = 23.0225,
        center_lng: float = 72.5714,
        zoom: int = 12,
    ) -> MapSearchResponse:
        """Search for CNG stations in the study area using Google Maps Search API."""
        search_query = query.strip() if query and query.strip() else "CNG pump in Ahmedabad"
        params = {
            "engine": "google_maps",
            "type": "search",
            "q": search_query,
            "ll": f"@{center_lat},{center_lng},{zoom}z",
            "hl": "en",
        }

        res = await serpapi_client.execute(params, ttl_seconds=86400)
        data = res[0]
        is_cached = res[1]
        is_fixture = res[2] if len(res) > 2 else False
        local_results = data.get("local_results", [])

        discovered_list: List[DiscoveredStation] = []
        now_iso = datetime.now(timezone.utc).isoformat()

        for idx, item in enumerate(local_results):
            coords = item.get("gps_coordinates") or {}
            lat = coords.get("latitude")
            lng = coords.get("longitude")
            if lat is None or lng is None:
                continue

            place_id = item.get("place_id")
            data_cid = str(item.get("data_cid")) if item.get("data_cid") else None
            data_id = item.get("data_id")

            # Unique candidate ID
            unique_key = place_id or data_cid or f"{round(lat, 5)}_{round(lng, 5)}"
            station_id = f"serpapi_{unique_key}"

            is_in_study = GeoService.is_within_study_area_bbox(float(lat), float(lng))

            station = DiscoveredStation(
                id=station_id,
                station_id=station_id,
                station_name=item.get("title") or f"CNG Station {idx + 1}",
                address=item.get("address"),
                latitude=float(lat),
                longitude=float(lng),
                verification_status="unverified_candidate",
                data_source="serpapi_google_maps",
                rating=float(item.get("rating")) if item.get("rating") is not None else None,
                reviews_count=int(item.get("reviews")) if item.get("reviews") is not None else None,
                open_state=item.get("open_state"),
                thumbnail=item.get("thumbnail"),
                phone=item.get("phone"),
                place_id=place_id,
                data_cid=data_cid,
                data_id=data_id,
                google_maps_url=item.get("link"),
                operating_status=item.get("operating_status", "OPERATIONAL"),
                is_within_study_area=is_in_study,
                discovered_at=now_iso,
            )
            discovered_list.append(station)

        # Persist discoveries safely in quarantine file without touching original CSVs
        if discovered_list:
            self.save_quarantined_discoveries(discovered_list)

        return MapSearchResponse(
            query=search_query,
            total_results=len(discovered_list),
            cached=is_cached,
            is_fixture=is_fixture,
            study_area_bbox=GeoService.AHMEDABAD_BBOX,
            stations=discovered_list,
        )

    async def autocomplete_locations(
        self,
        query: str,
        center_lat: float = 23.0225,
        center_lng: float = 72.5714,
    ) -> AutocompleteResponse:
        """Fetch location and keyword suggestions with distinction between places and keywords."""
        clean_q = query.strip()
        if not clean_q:
            return AutocompleteResponse(query=query, cached=True, suggestions=[])

        params = {
            "engine": "google_maps_autocomplete",
            "q": clean_q,
            "ll": f"@{center_lat},{center_lng},12z",
            "hl": "en",
        }

        res = await serpapi_client.execute(params, ttl_seconds=3600)
        data = res[0]
        is_cached = res[1]
        is_fixture = res[2] if len(res) > 2 else False
        raw_suggestions = data.get("suggestions", [])

        suggestions: List[AutocompleteSuggestion] = []
        for item in raw_suggestions:
            s_type = item.get("type", "keyword")
            is_place = (s_type == "place")
            place_dict = item.get("place", {}) if is_place else {}

            title = (
                place_dict.get("title")
                or item.get("value")
                or item.get("query")
                or clean_q
            )
            subtitle = place_dict.get("address") or item.get("subtitle")
            description = item.get("description") or f"{title}, {subtitle}" if subtitle else title

            coords = place_dict.get("gps_coordinates") or item.get("gps_coordinates") or {}
            lat = coords.get("latitude") or item.get("latitude")
            lng = coords.get("longitude") or item.get("longitude")

            has_valid_coords = False
            lat_f, lng_f = None, None
            if lat is not None and lng is not None:
                try:
                    lat_f = float(lat)
                    lng_f = float(lng)
                    is_valid, _ = GeoService.validate_coordinate_values(lat_f, lng_f)
                    has_valid_coords = is_valid
                except (ValueError, TypeError):
                    has_valid_coords = False

            suggestions.append(
                AutocompleteSuggestion(
                    title=title,
                    subtitle=subtitle,
                    description=description,
                    suggestion_type=s_type,
                    place_id=place_dict.get("place_id") or item.get("place_id"),
                    data_id=place_dict.get("data_id") or item.get("data_id"),
                    latitude=lat_f if has_valid_coords else None,
                    longitude=lng_f if has_valid_coords else None,
                    is_selectable_place=(is_place and has_valid_coords),
                )
            )

        return AutocompleteResponse(
            query=clean_q,
            cached=is_cached,
            is_fixture=is_fixture,
            suggestions=suggestions,
        )

    async def get_place_details(self, req: PlaceDetailsRequest) -> PlaceDetailsResponse:
        """Fetch rich place details (hours, rating, phone, photos, reviews) using place_id or data_cid."""
        params: Dict[str, Any] = {
            "engine": "google_maps",
            "hl": "en",
        }

        if req.place_id:
            params["place_id"] = req.place_id
        elif req.data_cid:
            params["data_cid"] = req.data_cid
        elif req.data_id and req.latitude is not None and req.longitude is not None:
            params["type"] = "place"
            params["data"] = f"!4m5!3m4!1s{req.data_id}!8m2!3d{req.latitude}!4d{req.longitude}"
        elif req.latitude is not None and req.longitude is not None:
            params["type"] = "search"
            params["q"] = f"{req.latitude},{req.longitude}"
        else:
            raise ValueError("Must provide place_id, data_cid, or data_id with coordinates.")

        res = await serpapi_client.execute(params, ttl_seconds=86400)
        data = res[0]
        is_cached = res[1]
        is_fixture = res[2] if len(res) > 2 else False
        res = data.get("place_results") or (
            data.get("local_results", [{}])[0] if data.get("local_results") else {}
        )

        title = res.get("title") or "CNG Station"
        address = res.get("address")
        phone = res.get("phone")
        website = res.get("website")
        rating = float(res.get("rating")) if res.get("rating") is not None else None
        reviews_count = int(res.get("reviews")) if res.get("reviews") is not None else None
        open_state = res.get("open_state")
        thumbnail = res.get("thumbnail")
        google_maps_url = res.get("link")

        # Parse operating hours
        hours_list: List[Dict[str, str]] = []
        raw_hours = res.get("operating_hours") or {}
        if isinstance(raw_hours, dict):
            for day, hrs in raw_hours.items():
                hours_list.append({"day": str(day), "hours": str(hrs)})

        # Parse GPS coordinates
        coords_dict = res.get("gps_coordinates") or {}
        gps_coords = None
        if coords_dict.get("latitude") is not None and coords_dict.get("longitude") is not None:
            gps_coords = GPSCoordinates(
                latitude=float(coords_dict["latitude"]),
                longitude=float(coords_dict["longitude"]),
            )

        # Parse photos
        images: List[str] = []
        if thumbnail:
            images.append(thumbnail)
        raw_photos = res.get("photos") or res.get("images") or []
        for p in raw_photos:
            if isinstance(p, dict) and p.get("image"):
                images.append(p["image"])
            elif isinstance(p, str):
                images.append(p)
        # Deduplicate
        images = list(dict.fromkeys(images))[:6]

        # Parse reviews
        reviews: List[PlaceReview] = []
        raw_reviews = res.get("reviews_per_score") or res.get("user_reviews") or res.get("reviews") or []
        if isinstance(raw_reviews, list):
            for r in raw_reviews[:5]:
                if isinstance(r, dict):
                    reviews.append(
                        PlaceReview(
                            author=r.get("username") or r.get("author") or "Google Reviewer",
                            rating=float(r.get("rating")) if r.get("rating") is not None else None,
                            date=r.get("date"),
                            snippet=r.get("snippet") or r.get("description"),
                        )
                    )

        return PlaceDetailsResponse(
            place_id=req.place_id or res.get("place_id"),
            data_cid=req.data_cid or str(res.get("data_cid", "")),
            data_id=req.data_id or res.get("data_id"),
            title=title,
            address=address,
            phone=phone,
            website=website,
            rating=rating,
            reviews_count=reviews_count,
            open_state=open_state,
            hours=hours_list if hours_list else None,
            gps_coordinates=gps_coords,
            thumbnail=thumbnail,
            images=images,
            google_maps_url=google_maps_url,
            reviews=reviews,
            cached=is_cached,
            is_fixture=is_fixture,
        )

    async def get_directions(self, req: DirectionsRequest) -> DirectionsResponse:
        """Calculate road directions, step instructions, Leaflet polyline points, and detour ratio."""
        # Calculate straight-line geodesic distance
        straight_line_km = GeoService.haversine_distance_km(
            req.start_lat, req.start_lng, req.end_lat, req.end_lng
        )

        params = {
            "engine": "google_maps_directions",
            "start_coords": f"{req.start_lat},{req.start_lng}",
            "end_coords": f"{req.end_lat},{req.end_lng}",
            "travel_mode": str(req.travel_mode),
            "distance_unit": "0",  # km
            "hl": "en",
        }

        res = await serpapi_client.execute(params, ttl_seconds=86400)
        data = res[0]
        is_cached = res[1]
        is_fixture = res[2] if len(res) > 2 else False
        directions_list = data.get("directions", [])
        places_info = data.get("places_info", [])

        # Start and end endpoints from places_info
        start_coord = [req.start_lat, req.start_lng]
        end_coord = [req.end_lat, req.end_lng]
        if len(places_info) >= 2:
            p0_coords = places_info[0].get("gps_coordinates") or {}
            p1_coords = places_info[1].get("gps_coordinates") or {}
            if "latitude" in p0_coords and "longitude" in p0_coords:
                start_coord = [p0_coords["latitude"], p0_coords["longitude"]]
            if "latitude" in p1_coords and "longitude" in p1_coords:
                end_coord = [p1_coords["latitude"], p1_coords["longitude"]]

        route_alternatives: List[RouteAlternative] = []

        for idx, route in enumerate(directions_list):
            trips = route.get("trips", [])
            via = route.get("via") or f"Route {idx + 1}"
            
            # Polyline collection starting with start_coord
            polyline: List[List[float]] = [list(start_coord)]
            steps: List[RouteStep] = []

            total_dist_km = 0.0
            total_duration_mins = 0.0
            dist_text = ""
            dur_text = ""

            for trip in trips:
                d_km, d_str = parse_distance_to_km(trip.get("distance"))
                t_mins, t_str = parse_duration_to_mins(trip.get("duration"))
                total_dist_km += d_km
                total_duration_mins += t_mins
                dist_text = d_str
                dur_text = t_str

                for detail in trip.get("details", []):
                    action_txt = detail.get("action") or "Proceed on route"
                    step_coords = detail.get("gps_coordinates")
                    step_gps = None
                    if step_coords and "latitude" in step_coords and "longitude" in step_coords:
                        step_lat = float(step_coords["latitude"])
                        step_lng = float(step_coords["longitude"])
                        step_gps = GPSCoordinates(latitude=step_lat, longitude=step_lng)
                        polyline.append([step_lat, step_lng])

                    steps.append(
                        RouteStep(
                            instruction=action_txt,
                            distance=str(detail.get("distance", "")),
                            duration=str(detail.get("duration", "")),
                            gps_coordinates=step_gps,
                        )
                    )

            # Finish polyline with destination
            polyline.append(list(end_coord))

            # Deduplicate sequential duplicate points
            cleaned_poly: List[List[float]] = []
            for pt in polyline:
                if not cleaned_poly or cleaned_poly[-1] != pt:
                    cleaned_poly.append(pt)

            if total_duration_mins == 0.0:
                if route.get("duration"):
                    total_duration_mins, dur_text = parse_duration_to_mins(route.get("duration"))
                elif route.get("formatted_duration"):
                    total_duration_mins, dur_text = parse_duration_to_mins(route.get("formatted_duration"))
                elif total_dist_km > 0:
                    total_duration_mins = round((total_dist_km / 28.0) * 60, 1)
                    dur_text = f"{round(total_duration_mins)} min"

            route_alternatives.append(
                RouteAlternative(
                    route_id=idx + 1,
                    summary=via,
                    distance_km=round(total_dist_km, 2),
                    distance_text=dist_text or f"{round(total_dist_km, 2)} km",
                    duration_mins=round(total_duration_mins, 1),
                    duration_text=dur_text or f"{round(total_duration_mins)} min",
                    steps=steps,
                    polyline_coords=cleaned_poly,
                )
            )

        if not route_alternatives:
            # Fallback if no specific road routes were returned
            road_km = round(straight_line_km * 1.3, 2)  # typical urban circuity fallback
            mins = round((road_km / 25.0) * 60, 1)  # 25 km/h urban speed estimate
            route_alternatives.append(
                RouteAlternative(
                    route_id=1,
                    summary="Direct Road Estimate",
                    distance_km=road_km,
                    distance_text=f"{road_km} km",
                    duration_mins=mins,
                    duration_text=f"{round(mins)} min",
                    steps=[
                        RouteStep(instruction=f"Depart from origin towards ({req.end_lat}, {req.end_lng})")
                    ],
                    polyline_coords=[start_coord, end_coord],
                )
            )

        primary_route = route_alternatives[0]
        primary_road_km = primary_route.distance_km
        detour_ratio = (
            round(primary_road_km / straight_line_km, 2)
            if straight_line_km > 0.05
            else 1.0
        )

        return DirectionsResponse(
            origin=GPSCoordinates(latitude=req.start_lat, longitude=req.start_lng),
            destination=GPSCoordinates(latitude=req.end_lat, longitude=req.end_lng),
            straight_line_distance_km=round(straight_line_km, 2),
            road_distance_km=primary_road_km,
            detour_ratio=detour_ratio,
            primary_duration_text=primary_route.duration_text,
            primary_duration_mins=primary_route.duration_mins,
            routes=route_alternatives,
            cached=is_cached,
            is_fixture=is_fixture,
        )


    VALID_CANDIDATE_STATUSES = {
        "unverified_candidate",
        "pending_review",
        "verified_project_record",
        "rejected",
        "proposed_simulation_location",
    }

    def check_for_duplicates(self, lat: float, lng: float, name: str) -> Optional[str]:
        """Check if candidate coordinates or name matches an existing station within 250m."""
        try:
            try:
                from services.station_service import StationService
            except ImportError:
                from server.services.station_service import StationService

            stations_resp = StationService.get_stations()
            for st in stations_resp.stations:
                if st.latitude is not None and st.longitude is not None:
                    dist = GeoService.haversine_distance_km(lat, lng, st.latitude, st.longitude)
                    if dist <= 0.25:  # within 250m
                        return f"{st.station_id} - {st.station_name} ({round(dist * 1000)}m away)"
        except Exception as e:
            logger.warning(f"Duplicate check failed: {e}")
        return None

    def get_candidates(self, status_filter: Optional[str] = None) -> List[DiscoveredStation]:
        """Retrieve candidates filtered optionally by verification status."""
        discoveries = self.load_quarantined_discoveries()
        if not status_filter or status_filter == "all":
            return discoveries
        return [s for s in discoveries if s.verification_status == status_filter]

    def get_candidates_summary(self) -> CandidateSummaryResponse:
        """Summary counts of candidate stations across review statuses."""
        discoveries = self.load_quarantined_discoveries()
        return CandidateSummaryResponse(
            total=len(discoveries),
            unverified_count=sum(1 for s in discoveries if s.verification_status == "unverified_candidate"),
            pending_review_count=sum(1 for s in discoveries if s.verification_status == "pending_review"),
            verified_count=sum(1 for s in discoveries if s.verification_status == "verified_project_record"),
            rejected_count=sum(1 for s in discoveries if s.verification_status == "rejected"),
            proposed_simulation_count=sum(1 for s in discoveries if s.verification_status == "proposed_simulation_location"),
        )

    def update_candidate_status(
        self,
        candidate_id: str,
        new_status: str,
        notes: Optional[str] = None,
    ) -> DiscoveredStation:
        """Update review status of a candidate station with audit history."""
        if new_status not in self.VALID_CANDIDATE_STATUSES:
            raise ValueError(
                f"Invalid status '{new_status}'. Must be one of {sorted(self.VALID_CANDIDATE_STATUSES)}"
            )

        discoveries = self.load_quarantined_discoveries()
        target: Optional[DiscoveredStation] = None
        target_idx: int = -1

        for idx, s in enumerate(discoveries):
            if s.id == candidate_id or s.station_id == candidate_id:
                target = s
                target_idx = idx
                break

        if target is None:
            raise KeyError(f"Candidate station with ID '{candidate_id}' not found in quarantine.")

        now_iso = datetime.now(timezone.utc).isoformat()
        old_status = target.verification_status

        # Append to review history
        history_entry = {
            "timestamp": now_iso,
            "previous_status": old_status,
            "new_status": new_status,
            "notes": notes or "Status updated by planner review workflow",
        }

        updated_history = list(target.review_history)
        updated_history.append(history_entry)

        # Check duplicate
        dup = target.potential_duplicate_of or self.check_for_duplicates(target.latitude, target.longitude, target.station_name)

        updated_station = target.model_copy(update={
            "verification_status": new_status,
            "reviewed_at": now_iso,
            "reviewer_notes": notes,
            "review_history": updated_history,
            "potential_duplicate_of": dup,
        })

        discoveries[target_idx] = updated_station
        self.save_quarantined_discoveries(discoveries)
        logger.info(f"Updated candidate '{candidate_id}' from '{old_status}' to '{new_status}'")
        return updated_station

    def get_service_status(self) -> MapsStatusResponse:
        """Get operational health, cache metrics, and mode."""
        cache_count = len(list(serpapi_client.cache_dir.glob("*.json"))) if serpapi_client.cache_dir.exists() else 0
        discoveries_count = len(self.load_quarantined_discoveries())
        fixtures_avail = bool(serpapi_client.fixtures_path and serpapi_client.fixtures_path.exists())
        return MapsStatusResponse(
            mode=serpapi_client.get_mode(),
            api_key_configured=bool(serpapi_client.api_key),
            cache_entries_count=cache_count,
            discoveries_count=discoveries_count,
            offline_fixtures_available=fixtures_avail,
        )

    def set_service_mode(self, mode: str) -> str:
        """Toggle SerpApi client operational mode."""
        serpapi_client.set_mode(mode)
        return serpapi_client.get_mode()


# Singleton service instance
google_maps_service = GoogleMapsService()

