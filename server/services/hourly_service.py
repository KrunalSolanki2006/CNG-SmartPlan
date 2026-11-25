"""Hourly demand service querying synthetic diurnal profile records across all eligible stations."""

from typing import List, Optional
from fastapi import HTTPException, status

from schemas.hourly import HourlyRecord, HourlyResponse
from services.data_loader import get_data_store


class HourlyService:
    """Service for querying synthetic hourly demand profiles."""

    @classmethod
    def get_hourly_demand(
        cls,
        station_id: Optional[str] = None,
        date: Optional[str] = None,
    ) -> HourlyResponse:
        """Query synthetic hourly records across all available stations."""
        store = get_data_store()
        raw_df = (
            store.gujarat_hourly_demand
            if getattr(store, "gujarat_hourly_demand", None) is not None
            else store.hourly
        )

        available_stations = sorted(raw_df["station_id"].unique().tolist())
        period_start = str(raw_df["date"].min())
        period_end = str(raw_df["date"].max())

        df = raw_df

        if station_id is not None:
            if station_id not in available_stations:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail={
                        "code": "VALIDATION_ERROR",
                        "message": f"Requested station {station_id} has no hourly profile in the active dataset.",
                        "fields": {"station_id": station_id},
                    },
                )
            df = df[df["station_id"] == station_id]

        if date is not None:
            if not (period_start <= date <= period_end):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail={
                        "code": "VALIDATION_ERROR",
                        "message": f"Requested date {date} is outside the available hourly period ({period_start} to {period_end}).",
                        "fields": {"date": date},
                    },
                )
            df = df[df["date"] == date]
        elif station_id is None and len(available_stations) > 10:
            # Avoid returning 100k+ unfiltered rows when both station_id and date are omitted
            df = df[df["date"] == period_end]

        df = df.sort_values(["station_id", "datetime"]).reset_index(drop=True)

        records: List[HourlyRecord] = [
            HourlyRecord(
                station_id=str(row.station_id),
                datetime=str(row.datetime),
                date=str(row.date),
                hour=int(row.hour),
                hourly_demand_kg=round(float(row.hourly_cng_demand_kg), 2),
                day_of_week=str(row.day_of_week),
                is_weekend=bool(row.is_weekend),
                simulation_profile=str(row.simulation_profile),
            )
            for row in df.itertuples(index=False)
        ]

        return HourlyResponse(
            data_origin="synthetic_demo",
            available_stations=available_stations,
            period_start=period_start,
            period_end=period_end,
            records=records,
            total_records=len(records),
            note=(
                f"Synthetic hourly profiles for {len(available_stations)} stations "
                f"({period_start} to {period_end}). Values reconcile to daily totals within 0.011 kg."
            ),
        )
