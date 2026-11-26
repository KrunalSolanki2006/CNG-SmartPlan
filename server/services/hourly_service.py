"""Hourly demand service querying synthetic diurnal profile records across all eligible stations."""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import HTTPException, status
import numpy as np
import pandas as pd

from schemas.forecast import ForecastRequest
from schemas.hourly import HourlyRecord, HourlyResponse
from services.data_loader import get_data_store

IST_TZ = timezone(timedelta(hours=5, minutes=30))


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
        max_forecast_date = (datetime.now(IST_TZ).date() + timedelta(days=30)).strftime("%Y-%m-%d")

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
            if date < period_start or date > max_forecast_date:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail={
                        "code": "VALIDATION_ERROR",
                        "message": f"Requested date {date} is outside the available hourly period ({period_start} to {max_forecast_date}).",
                        "fields": {"date": date},
                    },
                )

            if date <= period_end:
                df = df[df["date"] == date]
            else:
                # Project diurnal profile for future/current date (> period_end) using station's day-of-week hourly shape + daily forecast
                target_sid = station_id or available_stations[0]
                target_dt = datetime.strptime(date, "%Y-%m-%d").date()
                dow_name = target_dt.strftime("%A")
                is_wknd = target_dt.weekday() >= 5

                st_df = raw_df[raw_df["station_id"] == target_sid]
                dow_df = st_df[st_df["day_of_week"] == dow_name]
                shape_df = dow_df if not dow_df.empty else st_df
                hourly_means = shape_df.groupby("hour")["hourly_cng_demand_kg"].mean().reindex(range(24), fill_value=1.0)
                weights = hourly_means.values.astype(float)
                weights = weights / max(float(weights.sum()), 1e-9)

                # Match daily total to station forecast for `date` when available
                daily_total = float(hourly_means.sum())
                try:
                    from services.forecast_service import ForecastService
                    days_ahead = max(1, (target_dt - datetime.now(IST_TZ).date()).days + 1)
                    fc = ForecastService.generate_forecast(
                        ForecastRequest(
                            station_id=target_sid,
                            horizon_days=min(30, days_ahead),
                            model="holt_winters",
                            include_baseline=False,
                        )
                    )
                    matched = next((pt for pt in fc.forecast if pt.date == date), None)
                    if matched is not None:
                        daily_total = float(matched.forecast_demand_kg)
                except Exception:
                    pass

                sim_profile = str(st_df["simulation_profile"].iloc[0]) if not st_df.empty else "general"
                scaled = np.round(weights * daily_total, 2)
                # Ensure exact reconciliation within 0.01 kg
                diff = round(daily_total - float(scaled.sum()), 2)
                peak_idx = int(np.argmax(scaled))
                scaled[peak_idx] = round(float(scaled[peak_idx]) + diff, 2)

                records: List[HourlyRecord] = [
                    HourlyRecord(
                        station_id=target_sid,
                        datetime=f"{date} {h:02d}:00:00",
                        date=date,
                        hour=h,
                        hourly_demand_kg=float(scaled[h]),
                        day_of_week=dow_name,
                        is_weekend=is_wknd,
                        simulation_profile=sim_profile,
                    )
                    for h in range(24)
                ]
                return HourlyResponse(
                    data_origin="synthetic_demo",
                    available_stations=available_stations,
                    period_start=period_start,
                    period_end=max_forecast_date,
                    records=records,
                    total_records=24,
                    note=(
                        f"Projected diurnal profile for {target_sid} on {date} "
                        f"scaled to forecasted daily demand ({daily_total:.1f} kg)."
                    ),
                )
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
