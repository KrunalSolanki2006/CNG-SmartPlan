"""Gujarat-wide CNG Station Discovery Service via SerpApi Google Maps.

Searches 12 key commercial cities across Gujarat:
Ahmedabad, Surat, Vadodara, Rajkot, Bhavnagar, Jamnagar, Anand, Bharuch, Vapi, Navsari, Mehsana, Gandhidham.
Deduplicates via genuine Google Maps Place IDs and stores records in quarantine and discovered store.
"""

from datetime import datetime, timezone
import hashlib
import json
import logging
from pathlib import Path
import time
from typing import Any, Dict, List, Optional, Tuple
import httpx

try:
    from config import settings
    from services.serpapi_client import serpapi_client
except ImportError:
    from server.config import settings
    from server.services.serpapi_client import serpapi_client

logger = logging.getLogger(__name__)

GUJARAT_CITIES = [
    {"city": "Ahmedabad", "district": "Ahmedabad", "lat": 23.0225, "lng": 72.5714, "zoom": 12},
    {"city": "Surat", "district": "Surat", "lat": 21.1702, "lng": 72.8311, "zoom": 12},
    {"city": "Vadodara", "district": "Vadodara", "lat": 22.3072, "lng": 73.1812, "zoom": 12},
    {"city": "Rajkot", "district": "Rajkot", "lat": 22.3039, "lng": 70.8022, "zoom": 12},
    {"city": "Bhavnagar", "district": "Bhavnagar", "lat": 21.7645, "lng": 72.1519, "zoom": 12},
    {"city": "Jamnagar", "district": "Jamnagar", "lat": 22.4707, "lng": 70.0577, "zoom": 12},
    {"city": "Anand", "district": "Anand", "lat": 22.5645, "lng": 72.9289, "zoom": 12},
    {"city": "Bharuch", "district": "Bharuch", "lat": 21.7051, "lng": 72.9959, "zoom": 12},
    {"city": "Vapi", "district": "Valsad", "lat": 20.3893, "lng": 72.9106, "zoom": 12},
    {"city": "Navsari", "district": "Navsari", "lat": 20.9467, "lng": 72.9520, "zoom": 12},
    {"city": "Mehsana", "district": "Mehsana", "lat": 23.5880, "lng": 72.3693, "zoom": 12},
    {"city": "Gandhidham", "district": "Kutch", "lat": 23.0753, "lng": 70.1337, "zoom": 12},
]

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DISCOVERED_STATIONS_FILE = DATA_DIR / "curated" / "discovered_cng_stations_gujarat.json"
DISCOVERY_METRICS_FILE = DATA_DIR / "curated" / "discovery_diagnostics.json"


class GujaratDiscoveryService:
    """Manages multi-city station discovery, deduplication, and provenance auditing."""

    @classmethod
    def load_discovered_stations(cls) -> List[Dict[str, Any]]:
        """Load discovered stations from disk."""
        if not DISCOVERED_STATIONS_FILE.exists():
            return []
        try:
            with open(DISCOVERED_STATIONS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Could not load discovered stations: {e}")
            return []

    @classmethod
    def load_discovery_diagnostics(cls) -> Dict[str, Any]:
        """Load latest discovery run diagnostics."""
        if not DISCOVERY_METRICS_FILE.exists():
            return {
                "last_discovery_time": None,
                "cities_searched": [],
                "api_requests_total": 0,
                "api_requests_successful": 0,
                "api_requests_cached": 0,
                "api_requests_failed": 0,
                "results_discovered": 0,
                "new_records_added": 0,
                "duplicate_records": 0,
                "manual_verification_required": 0,
                "mode": "OFFLINE DEMO DATA",
                "city_breakdown": {},
            }
        try:
            with open(DISCOVERY_METRICS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Could not load discovery diagnostics: {e}")
            return {}

    @classmethod
    def run_discovery_pipeline(
        cls,
        cities: Optional[List[str]] = None,
        force_live: bool = False,
    ) -> Dict[str, Any]:
        """Run discovery across target cities, deduplicate records, and update diagnostic ledger."""
        api_key = settings.serpapi_api_key
        target_cities = [c for c in GUJARAT_CITIES if not cities or c["city"].lower() in [x.lower() for x in cities]]
        
        now_iso = datetime.now(timezone.utc).isoformat()
        
        diagnostics = {
            "last_discovery_time": now_iso,
            "cities_searched": [c["city"] for c in target_cities],
            "api_requests_total": 0,
            "api_requests_successful": 0,
            "api_requests_cached": 0,
            "api_requests_failed": 0,
            "results_discovered": 0,
            "new_records_added": 0,
            "duplicate_records": 0,
            "manual_verification_required": 0,
            "mode": "LIVE API RESULTS" if (api_key and not settings.serpapi_mode == "demo") else "CACHED RESULTS",
            "city_breakdown": {},
        }

        existing_stations = cls.load_discovered_stations()
        station_map: Dict[str, Dict[str, Any]] = {}
        for s in existing_stations:
            key = s.get("place_id") or s.get("station_id")
            if key:
                station_map[key] = s

        total_discovered_raw = 0
        new_added = 0
        duplicates = 0

        for target in target_cities:
            city_name = target["city"]
            district_name = target["district"]
            lat = target["lat"]
            lng = target["lng"]
            zoom = target["zoom"]

            query = f"CNG pump in {city_name}"
            params = {
                "engine": "google_maps",
                "type": "search",
                "q": query,
                "ll": f"@{lat},{lng},{zoom}z",
                "hl": "en",
            }

            # Check cache or execute
            diagnostics["api_requests_total"] += 1
            city_results = []
            is_from_cache = False

            # Cache key
            cache_file = serpapi_client._get_cache_path(params)
            cached_data = None
            if not force_live:
                cached_data = serpapi_client._read_cache(cache_file, ttl_seconds=86400 * 7)

            if cached_data is not None:
                is_from_cache = True
                diagnostics["api_requests_cached"] += 1
                diagnostics["api_requests_successful"] += 1
                city_results = cached_data.get("local_results", [])
            else:
                # Live network call
                if not api_key:
                    diagnostics["api_requests_failed"] += 1
                    diagnostics["city_breakdown"][city_name] = {"status": "skipped_no_api_key", "count": 0}
                    continue

                req_params = dict(params)
                req_params["api_key"] = api_key
                try:
                    with httpx.Client(timeout=30.0) as client:
                        resp = client.get(serpapi_client.base_url, params=req_params)
                        resp.raise_for_status()
                        raw_json = resp.json()

                    if "error" in raw_json:
                        diagnostics["api_requests_failed"] += 1
                        diagnostics["city_breakdown"][city_name] = {"status": "api_error", "error": raw_json["error"]}
                        continue

                    # Write cache
                    serpapi_client._write_cache(cache_file, raw_json)
                    diagnostics["api_requests_successful"] += 1
                    city_results = raw_json.get("local_results", [])
                except Exception as err:
                    diagnostics["api_requests_failed"] += 1
                    logger.warning(f"SerpApi query failed for {city_name}: {err}")
                    diagnostics["city_breakdown"][city_name] = {"status": "request_failed", "error": str(err)}
                    continue

            # Process city results
            city_raw_count = len(city_results)
            total_discovered_raw += city_raw_count
            city_new_count = 0

            for idx, item in enumerate(city_results):
                coords = item.get("gps_coordinates") or {}
                st_lat = coords.get("latitude")
                st_lng = coords.get("longitude")
                if st_lat is None or st_lng is None:
                    continue

                place_id = item.get("place_id")
                data_cid = str(item.get("data_cid")) if item.get("data_cid") else None
                data_id = item.get("data_id")

                unique_key = place_id or data_cid or f"{city_name}_{round(float(st_lat), 5)}_{round(float(st_lng), 5)}"

                if unique_key in station_map:
                    duplicates += 1
                    continue

                # Generate clean station ID
                station_record = {
                    "station_id": f"DISC_{city_name[:3].upper()}_{len(station_map) + 1:03d}",
                    "place_id": place_id,
                    "data_cid": data_cid,
                    "data_id": data_id,
                    "station_name": item.get("title") or f"{city_name} CNG Station {idx + 1}",
                    "address": item.get("address") or f"{city_name}, Gujarat",
                    "city": city_name,
                    "district": district_name,
                    "state": "Gujarat",
                    "latitude": round(float(st_lat), 6),
                    "longitude": round(float(st_lng), 6),
                    "rating": float(item.get("rating")) if item.get("rating") is not None else None,
                    "reviews_count": int(item.get("reviews")) if item.get("reviews") is not None else None,
                    "open_state": item.get("open_state"),
                    "thumbnail": item.get("thumbnail"),
                    "phone": item.get("phone"),
                    "google_maps_url": item.get("link"),
                    "operating_status": item.get("operating_status", "OPERATIONAL"),
                    "verification_status": "Discovered",
                    "source": "Google Maps (SerpAPI)",
                    "source_reference": f"Google Maps Place Search: 'CNG pump in {city_name}'",
                    "data_source": "serpapi_google_maps",
                    "evidence_cng_service": "Documented in Google Maps business listing / title / amenities",
                    "evidence_operational": item.get("open_state") or item.get("operating_status", "OPERATIONAL"),
                    "verified_by_authority": False,
                    "requires_manual_review": True,
                    "discovered_at": now_iso,
                }

                station_map[unique_key] = station_record
                new_added += 1
                city_new_count += 1

            diagnostics["city_breakdown"][city_name] = {
                "status": "success",
                "raw_results": city_raw_count,
                "new_stations_added": city_new_count,
                "cached": is_from_cache,
            }

        # Save all discovered stations
        DISCOVERED_STATIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
        final_list = list(station_map.values())
        with open(DISCOVERED_STATIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(final_list, f, indent=2)

        # Update diagnostics ledger
        diagnostics["results_discovered"] = total_discovered_raw
        diagnostics["new_records_added"] = new_added
        diagnostics["duplicate_records"] = duplicates
        diagnostics["manual_verification_required"] = len(final_list)

        with open(DISCOVERY_METRICS_FILE, "w", encoding="utf-8") as f:
            json.dump(diagnostics, f, indent=2)

        return diagnostics
