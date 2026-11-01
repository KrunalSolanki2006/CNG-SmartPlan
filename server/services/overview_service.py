"""Overview service computing system-wide dashboard summary metrics."""

from datetime import datetime, timezone
import pandas as pd

from schemas.overview import (
    DataQualityFlags,
    ForecastSummary,
    HourlySummary,
    NetworkSummary,
    OverviewResponse,
    ShortfallAlertsSummary,
    StationCountsOverview,
)
from services.data_loader import get_data_store


class OverviewService:
    """Service for computing dashboard overview metrics strictly from validated data files."""

    @classmethod
    def get_overview(cls) -> OverviewResponse:
        """Compute system overview response matching docs/API_CONTRACT.md Section 3."""
        store = get_data_store()
        daily = store.daily_sales
        supply = store.supply
        hourly = store.hourly

        # Station counts
        total_stations = len(store.stations)
        eligible_sim = len(store.eligible_stations)
        eligible_map = len(store.map_eligible_stations)

        # Network daily demand aggregation
        network_daily_sum = daily.groupby("date")["synthetic_sales_kg"].sum()
        mean_daily_demand = round(float(network_daily_sum.mean()), 1)

        # Shortfall alert count from matched series
        merged = pd.merge(
            daily[["station_id", "date", "synthetic_sales_kg"]],
            supply[["station_id", "date", "planned_available_supply_kg"]],
            on=["station_id", "date"],
            how="inner",
        )
        shortfall_days_count = int((merged["planned_available_supply_kg"] < merged["synthetic_sales_kg"]).sum())

        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        return OverviewResponse(
            station_counts=StationCountsOverview(
                total_in_inventory=total_stations,
                eligible_for_simulation=eligible_sim,
                eligible_for_map_display=eligible_map,
                note="No verified coordinates exist; all map-eligible counts are zero.",
            ),
            network_summary=NetworkSummary(
                data_origin="synthetic_demo",
                date_range_start=str(daily["date"].min()),
                date_range_end=str(daily["date"].max()),
                total_stations_in_series=int(daily["station_id"].nunique()),
                mean_daily_network_demand_kg=mean_daily_demand,
                note="Synthetic demonstration data only. Not actual recorded sales.",
            ),
            forecast_summary=ForecastSummary(
                data_origin="synthetic_demo",
                horizon_days=7,
                stations_forecasted=eligible_sim,
                note="Forecast generated from synthetic historical data.",
            ),
            shortfall_alerts=ShortfallAlertsSummary(
                data_origin="synthetic_demo",
                total_station_days_with_shortfall=shortfall_days_count,
                stations_with_current_alert=[],
                note="Based on synthetic supply and synthetic historical sales. Not actual stockout data.",
            ),
            hourly_summary=HourlySummary(
                data_origin="synthetic_demo",
                stations_with_hourly_data=sorted(hourly["station_id"].unique().tolist()),
                hourly_period_start=str(hourly["date"].min()),
                hourly_period_end=str(hourly["date"].max()),
            ),
            data_quality_flags=DataQualityFlags(
                verified_coordinates=False,
                real_sales_data=False,
                real_supply_data=False,
                holiday_data=False,
            ),
            generated_at=now_utc,
        )

