"""Geographic verification, geodesic distance, and spatial validation services.

Governed strictly by docs/API_CONTRACT.md and docs/DATA_PROVENANCE.md.
Rules:
- Never promote unverified candidate coordinates to approved map pins.
- Distance is straight-line geodesic distance (Haversine), never road or drive time.
- If zero stations have verified coordinates, return explicit unavailable states.
"""

import math
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
from services.data_loader import get_data_store


class GeoService:
    """Geographic calculations and station coordinate verification service."""

    # Volumetric mean radius of Earth in kilometers (IUGG recommended value)
    EARTH_RADIUS_KM: float = 6371.0088

    # Provisional Ahmedabad study area bounding box (approximate urban footprint)
    # Note: Dated AMC municipal ward polygon is unvalidated (Gap 1).
    AHMEDABAD_BBOX = {
        "lat_min": 22.80,
        "lat_max": 23.30,
        "lon_min": 72.30,
        "lon_max": 72.80,
    }

    @staticmethod
    def validate_coordinate_values(
        lat: float,
        lon: float,
    ) -> Tuple[bool, Optional[str]]:
        """Validate latitude and longitude values against real spherical coordinate bounds.

        Args:
            lat: Latitude in decimal degrees.
            lon: Longitude in decimal degrees.

        Returns:
            Tuple of (is_valid, error_message).
        """
        if lat is None or lon is None:
            return False, "Coordinates cannot be null or None"

        try:
            lat_f = float(lat)
            lon_f = float(lon)
        except (ValueError, TypeError):
            return False, f"Coordinates must be numeric floats. Received lat={lat}, lon={lon}"

        if math.isnan(lat_f) or math.isnan(lon_f) or math.isinf(lat_f) or math.isinf(lon_f):
            return False, "Coordinates cannot be NaN or infinite"

        if not (-90.0 <= lat_f <= 90.0):
            return (
                False,
                f"Latitude {lat_f} is out of valid range [-90.0, 90.0] degrees",
            )

        if not (-180.0 <= lon_f <= 180.0):
            return (
                False,
                f"Longitude {lon_f} is out of valid range [-180.0, 180.0] degrees",
            )

        return True, None

    @classmethod
    def haversine_distance_km(
        cls,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
    ) -> float:
        """Calculate great-circle straight-line distance between two points on Earth using Haversine formula.

        Notice: This is straight-line spherical geodesic distance only.
        It does NOT measure road network distance, traffic conditions, or travel drive time.

        Args:
            lat1: Latitude of point 1 in decimal degrees.
            lon1: Longitude of point 1 in decimal degrees.
            lat2: Latitude of point 2 in decimal degrees.
            lon2: Longitude of point 2 in decimal degrees.

        Returns:
            Distance in kilometers (>= 0.0).

        Raises:
            ValueError: If any coordinate is outside valid geographical bounds.
        """
        valid1, err1 = cls.validate_coordinate_values(lat1, lon1)
        if not valid1:
            raise ValueError(f"Invalid point 1: {err1}")

        valid2, err2 = cls.validate_coordinate_values(lat2, lon2)
        if not valid2:
            raise ValueError(f"Invalid point 2: {err2}")

        # Convert decimal degrees to radians
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        # Haversine formula
        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
        )
        # Numerical safeguard against precision drift outside [0, 1]
        a = min(1.0, max(0.0, a))
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

        return cls.EARTH_RADIUS_KM * c

    @classmethod
    def is_within_study_area_bbox(cls, lat: float, lon: float) -> bool:
        """Check whether a coordinate point falls inside the provisional Ahmedabad bounding box.

        BBox: [22.80, 23.30] N, [72.30, 72.80] E.
        """
        valid, _ = cls.validate_coordinate_values(lat, lon)
        if not valid:
            return False

        lat_f = float(lat)
        lon_f = float(lon)

        return (
            cls.AHMEDABAD_BBOX["lat_min"] <= lat_f <= cls.AHMEDABAD_BBOX["lat_max"]
            and cls.AHMEDABAD_BBOX["lon_min"] <= lon_f <= cls.AHMEDABAD_BBOX["lon_max"]
        )

    @classmethod
    def find_nearby_approved_stations(
        cls,
        lat: float,
        lon: float,
        radius_km: float = 3.0,
    ) -> Dict[str, Any]:
        """Search for approved, verified stations within radius_km of a query point.

        Strict governance rule:
        Only stations where `coordinates_verified == True` and `approved_for_map_pin == True`
        may be included in distance calculations. All 8 candidate coordinates are unapproved.
        Therefore, this method currently returns `geographic_analysis_available: False`
        with an empty list of approved stations.
        """
        valid, err = cls.validate_coordinate_values(lat, lon)
        if not valid:
            raise ValueError(f"Invalid query point coordinates: {err}")

        if radius_km <= 0 or radius_km > 50.0:
            raise ValueError(
                f"Search radius_km must be between 0.1 and 50.0 km. Received: {radius_km}"
            )

        store = get_data_store()
        approved_stations = store.map_eligible_stations

        query_bbox_status = cls.is_within_study_area_bbox(lat, lon)

        if len(approved_stations) == 0:
            return {
                "geographic_analysis_available": False,
                "reason": (
                    "No stations have independently verified coordinates. "
                    "All 8 coordinate candidates are unapproved (approved_for_map_pin=no). "
                    "Straight-line distance cannot be computed against unverified points."
                ),
                "nearby_stations": [],
                "approved_station_count": 0,
                "query_point": {
                    "latitude": float(lat),
                    "longitude": float(lon),
                    "in_study_area_bbox": query_bbox_status,
                },
                "radius_km": float(radius_km),
                "distance_method": "Haversine (straight-line spherical geodesic distance in km; not road distance or drive time)",
                "disclaimer": (
                    "No stations are approved for geospatial distance calculations. "
                    "Candidate coordinates in research queue remain unapproved."
                ),
            }

        # If any station ever qualifies in future verified packages:
        nearby: List[Dict[str, Any]] = []
        for _, station in approved_stations.iterrows():
            st_lat = float(station["latitude"])
            st_lon = float(station["longitude"])
            dist = cls.haversine_distance_km(lat, lon, st_lat, st_lon)
            if dist <= radius_km:
                nearby.append(
                    {
                        "station_id": station["station_id"],
                        "station_name": station["station_name"],
                        "distance_km": round(dist, 3),
                        "distance_type": "straight_line_geodesic",
                        "latitude": st_lat,
                        "longitude": st_lon,
                    }
                )

        nearby.sort(key=lambda s: s["distance_km"])

        return {
            "geographic_analysis_available": True,
            "reason": None,
            "nearby_stations": nearby,
            "approved_station_count": len(approved_stations),
            "query_point": {
                "latitude": float(lat),
                "longitude": float(lon),
                "in_study_area_bbox": query_bbox_status,
            },
            "radius_km": float(radius_km),
            "distance_method": "Haversine (straight-line spherical geodesic distance in km; not road distance or drive time)",
            "disclaimer": None,
        }

    @classmethod
    def evaluate_candidate_point(
        cls,
        lat: float,
        lon: float,
    ) -> Dict[str, Any]:
        """Validate and evaluate an arbitrary candidate/proposed station location.

        Keeps the candidate point strictly separate from master station records.
        """
        valid, err = cls.validate_coordinate_values(lat, lon)
        if not valid:
            return {
                "is_valid": False,
                "error": err,
                "latitude": lat,
                "longitude": lon,
                "in_study_area_bbox": False,
            }

        in_bbox = cls.is_within_study_area_bbox(lat, lon)

        return {
            "is_valid": True,
            "error": None,
            "latitude": float(lat),
            "longitude": float(lon),
            "in_study_area_bbox": in_bbox,
            "boundary_note": (
                "Provisional bounding box check only. "
                "Official AMC municipal polygon not validated in dataset."
            ),
            "classification": "user_scenario_candidate_point",
        }

    @staticmethod
    def get_candidate_audit_summary() -> Dict[str, Any]:
        """Retrieve authoritative verification audit across all 12 stations."""
        store = get_data_store()
        candidates_df = store.coordinate_candidates
        stations_df = store.stations

        total_stations = len(stations_df)
        candidate_count = len(candidates_df)
        approved_count = len(store.map_eligible_stations)

        operator_conflicts = [
            r["station_id"]
            for _, r in candidates_df.iterrows()
            if "discrepancy" in str(r.get("cng_status_conflict", "")).lower()
            or "operator" in str(r.get("cng_status_conflict", "")).lower()
        ]

        unconfirmed_dispensers = [
            r["station_id"]
            for _, r in candidates_df.iterrows()
            if "unconfirmed" in str(r.get("cng_status_conflict", "")).lower()
        ]

        no_candidate_stations = [
            r["station_id"]
            for _, r in stations_df.iterrows()
            if r["station_id"] not in candidates_df["station_id"].values
        ]

        return {
            "total_stations": total_stations,
            "candidates_found": candidate_count,
            "approved_for_map_pin_count": approved_count,
            "unapproved_candidates_count": candidate_count,
            "stations_without_candidates": no_candidate_stations,
            "operator_conflict_stations": operator_conflicts,
            "unconfirmed_dispenser_stations": unconfirmed_dispensers,
            "boundary_status": "provisional_locality_screen",
            "amc_polygon_validated": False,
            "open_street_map_attribution": "© OpenStreetMap contributors, ODbL",
        }

