"""Hourly demand service querying synthetic diurnal profile records."""

from typing import List, Optional
from fastapi import HTTPException, status
import pandas as pd

from schemas.hourly import HourlyRecord, HourlyResponse
from services.data_loader import get_data_store

ALLOWED_HOURLY_STATIONS = ["AMD001", "AMD004", "AMD008"]
HOURLY_PERIOD_START = "2025-12-02"
HOURLY_PERIOD_END = "2025-12-31"


class HourlyService:
    """Service for querying synthetic hourly demand profiles."""

    @classmethod
    def get_hourly_demand(
        cls,
        station_id: Optional[str] = None,
        date: Optional[str] = None,
    ) -> HourlyResponse:
        """Query synthetic hourly records per docs/API_CONTRACT.md Section 3."""
        store = get_data_store()
        df = store.hourly.copy()

        # Validate station_id if provided
        if station_id is not None:
            if station_id not in ALLOWED_HOURLY_STATIONS:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "code": "VALIDATION_ERROR",
                        "message": f"Hourly data is available only for {', '.join(ALLOWED_HOURLY_STATIONS)}. Requested station {station_id} has no hourly profile.",
                        "fields": {"station_id": station_id},
                    },
                )
            df = df[df["station_id"] == station_id]

        # Validate date if provided
        if date is not None:
            if not (HOURLY_PERIOD_START <= date <= HOURLY_PERIOD_END):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={
                        "code": "VALIDATION_ERROR",
                        "message": f"Requested date {date} is outside the available hourly period ({HOURLY_PERIOD_START} to {HOURLY_PERIOD_END}).",
                        "fields": {"date": date},
                    },
                )
            df = df[df["date"] == date]

        df = df.sort_values(["station_id", "datetime"]).reset_index(drop=True)

        records: List[HourlyRecord] = []
        for _, row in df.iterrows():
            records.append(
                HourlyRecord(
                    station_id=str(row["station_id"]),
                    datetime=str(row["datetime"]),
                    date=str(row["date"]),
                    hour=int(row["hour"]),
                    hourly_demand_kg=round(float(row["hourly_cng_demand_kg"]), 2),
                    day_of_week=str(row["day_of_week"]),
                    is_weekend=bool(row["is_weekend"]),
                    simulation_profile=str(row["simulation_profile"]),
                )
            )

        return HourlyResponse(
            data_origin="synthetic_demo",
            available_stations=ALLOWED_HOURLY_STATIONS,
            period_start=HOURLY_PERIOD_START,
            period_end=HOURLY_PERIOD_END,
            records=records,
            total_records=len(records),
            note="Synthetic hourly profiles for 3 stations. Values reconcile to daily totals within 0.011 kg.",
        )

