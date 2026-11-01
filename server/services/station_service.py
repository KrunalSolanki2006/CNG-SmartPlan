"""Station service providing query access to station records, spatial eligibility, and historical sales."""

from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
import numpy as np
import pandas as pd

from schemas.stations import HistoryPoint, StationHistoryResponse
from services.data_loader import get_data_store, CoordinateVerifier
from services.geo_service import GeoService

# Canonical profile mappings established by data package
STATION_PROFILES: Dict[str, str] = {
    "AMD001": "commuter_corridor",
    "AMD002": "commuter_corridor",
    "AMD003": "commuter_corridor",
    "AMD004": "central_urban",
    "AMD005": "commuter_corridor",
    "AMD006": "central_urban",
    "AMD007": "commuter_corridor",
    "AMD008": "mixed_urban",
    "AMD009": "central_urban",
    "AMD010": "uncertain_fringe",
    "AMD011": "mixed_urban",
    "AMD012": "central_urban",
}


def format_station_record(row: pd.Series) -> Dict[str, Any]:
    """Format station DataFrame row into canonical Station schema."""
    station_id = str(row["station_id"])
    in_study_area = str(row["in_study_area"])
    eligible_for_sim = in_study_area == "yes"
    eligible_for_map = CoordinateVerifier.is_eligible_for_map_pin(row)

    # Latitude/longitude are None if not verified
    lat = float(row["latitude"]) if pd.notna(row["latitude"]) and eligible_for_map else None
    lon = float(row["longitude"]) if pd.notna(row["longitude"]) and eligible_for_map else None

    # Handle nullable operator
    operator_val = str(row["operator"]) if pd.notna(row["operator"]) else "not established"

    return {
        "station_id": station_id,
        "station_name": str(row["station_name"]),
        "locality": str(row["locality"]),
        "address": str(row["address"]),
        "pincode": str(row["pincode"]),
        "operator": operator_val,
        "brand": str(row["brand"]),
        "cng_status": str(row["cng_status"]),
        "in_study_area": in_study_area,
        "coordinates_verified": bool(row["coordinates_verified"]) if pd.notna(row["coordinates_verified"]) else False,
        "latitude": lat,
        "longitude": lon,
        "verification_status": str(row["verification_status"]),
        "data_origin": str(row["data_type"]),
        "simulation_profile": STATION_PROFILES.get(station_id, "unknown"),
        "eligible_for_simulation": eligible_for_sim,
        "eligible_for_map_pin": eligible_for_map,
    }


class StationService:
    """Service for querying stations and checking spatial/simulation eligibility."""

    @classmethod
    def get_all_stations(
        cls,
        in_study_area: Optional[str] = None,
        eligible_for_simulation: Optional[bool] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve list of stations filtered by study area or simulation eligibility."""
        store = get_data_store()
        df = store.stations.copy()

        if in_study_area is not None:
            df = df[df["in_study_area"] == in_study_area]

        if eligible_for_simulation is True:
            df = df[df["in_study_area"] == "yes"]
        elif eligible_for_simulation is False:
            df = df[df["in_study_area"] != "yes"]

        return [format_station_record(row) for _, row in df.iterrows()]

    @classmethod
    def get_station_by_id(cls, station_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve station record by station_id or None."""
        store = get_data_store()
        match = store.stations[store.stations["station_id"] == station_id]
        if match.empty:
            return None
        return format_station_record(match.iloc[0])

    @classmethod
    def get_eligible_stations(cls) -> List[Dict[str, Any]]:
        """Retrieve all 11 stations eligible for synthetic simulation."""
        return cls.get_all_stations(eligible_for_simulation=True)

    @classmethod
    def get_station_history(
        cls,
        station_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        aggregation: str = "daily",
    ) -> StationHistoryResponse:
        """Retrieve historical synthetic daily/weekly sales for a station.

        Raises 404 HTTPException if station does not exist or has no simulation series.
        """
        store = get_data_store()

        # Check station existence in directory
        station_meta = cls.get_station_by_id(station_id)
        if not station_meta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "STATION_NOT_FOUND",
                    "message": f"No station with ID {station_id} exists in the inventory.",
                    "fields": None,
                },
            )

        # Check if station is in synthetic series (AMD010 is excluded)
        daily_df = store.daily_sales
        station_daily = daily_df[daily_df["station_id"] == station_id].copy()

        if station_daily.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "STATION_NOT_FOUND",
                    "message": f"Station {station_id} ({station_meta['station_name']}) has no synthetic sales history (excluded from simulation, in_study_area={station_meta['in_study_area']}).",
                    "fields": None,
                },
            )

        # Default date bounds
        start = start_date or "2024-01-01"
        end = end_date or "2025-12-31"

        # Filter by date range
        filtered = station_daily[(station_daily["date"] >= start) & (station_daily["date"] <= end)].copy()
        filtered = filtered.sort_values("date").reset_index(drop=True)

        series_points: List[HistoryPoint] = []

        if aggregation == "weekly":
            # Group by ISO week (Monday as start)
            filtered["dt"] = pd.to_datetime(filtered["date"])
            filtered["week_start"] = filtered["dt"].apply(lambda d: (d - pd.Timedelta(days=d.weekday())).strftime("%Y-%m-%d"))

            weekly = filtered.groupby("week_start", as_index=False).agg({
                "synthetic_sales_kg": "sum",
                "simulation_profile": "first",
            })

            for _, row in weekly.iterrows():
                series_points.append(
                    HistoryPoint(
                        date=str(row["week_start"]),
                        demand_kg=round(float(row["synthetic_sales_kg"]), 2),
                        day_of_week=None,
                        is_weekend=None,
                        simulation_profile=str(row["simulation_profile"]),
                    )
                )
        else:
            # Daily series
            for _, row in filtered.iterrows():
                series_points.append(
                    HistoryPoint(
                        date=str(row["date"]),
                        demand_kg=round(float(row["synthetic_sales_kg"]), 2),
                        day_of_week=str(row["day_of_week"]),
                        is_weekend=bool(row["is_weekend"]),
                        simulation_profile=str(row["simulation_profile"]),
                    )
                )

        return StationHistoryResponse(
            station_id=station_id,
            station_name=station_meta["station_name"],
            data_origin="synthetic_demo",
            aggregation=aggregation,
            date_range_start=start,
            date_range_end=end,
            total_records=len(series_points),
            missing_records=0,
            missing_holiday_data=True,
            series=series_points,
            note="Synthetic demonstration data only. Not actual station sales records.",
        )

    @classmethod
    def find_nearby_stations(
        cls,
        lat: float,
        lon: float,
        radius_km: float = 3.0,
    ) -> Dict[str, Any]:
        """Search for approved stations near a point. Delegates to GeoService."""
        return GeoService.find_nearby_approved_stations(lat=lat, lon=lon, radius_km=radius_km)

    @classmethod
    def get_candidate_audit_summary(cls) -> Dict[str, Any]:
        """Retrieve verification status summary for all candidates. Delegates to GeoService."""
        return GeoService.get_candidate_audit_summary()

