"""Data quality service exposing dataset provenance, coverage, and documented research gaps."""

from datetime import datetime, timezone
from typing import List

from schemas.quality import (
    BaselineEvaluationQuality,
    DailySalesQuality,
    DataGapItem,
    DataQualityResponse,
    HourlyDemandQuality,
    StationInventoryQuality,
    SupplyQuality,
    SyntheticDataQuality,
)
from services.data_loader import get_data_store

CANONICAL_DATA_GAPS = [
    {"gap": "Verified station coordinates", "impact": "No map pins; no distance-based analysis"},
    {"gap": "Actual station-level daily/hourly sales", "impact": "All forecasting uses synthetic data"},
    {"gap": "Actual planned supply and delivery records", "impact": "Supply alerts are synthetic-demo only"},
    {"gap": "Ahmedabad-specific vehicle registrations", "impact": "No real demand covariate"},
    {"gap": "Official holiday calendar 2024-2025", "impact": "is_public_holiday blank in all 8041 rows"},
    {"gap": "Complete cross-operator station inventory", "impact": "12-station master is partial subset"},
    {"gap": "Verified Ahmedabad municipal boundary", "impact": "Study-area inclusion is locality-screened only"},
    {"gap": "Road/traffic/land-use indicators", "impact": "Impact simulator is assumption-based only"},
]


class QualityService:
    """Service for building the data quality, provenance, and gaps report."""

    @classmethod
    def get_quality_report(cls) -> DataQualityResponse:
        """Construct data quality response matching docs/API_CONTRACT.md Section 3."""
        store = get_data_store()
        daily = store.daily_sales
        supply = store.supply
        hourly = store.hourly

        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Station inventory metadata
        inventory_quality = StationInventoryQuality(
            total_stations=len(store.stations),
            eligible_for_simulation=len(store.eligible_stations),
            eligible_for_map_pin=len(store.map_eligible_stations),
            data_origin="real_public",
            sources=["Gujarat Energy Limited directory", "HPCL CNG outlet directory"],
            access_date="2026-10-29",
            coordinate_status="No verified coordinates; 8 secondary-source candidates remain unapproved",
        )

        # Synthetic time-series statistics
        synthetic_quality = SyntheticDataQuality(
            daily_sales=DailySalesQuality(
                rows=len(daily),
                columns=len(daily.columns),
                stations=int(daily["station_id"].nunique()),
                date_range_start=str(daily["date"].min()),
                date_range_end=str(daily["date"].max()),
                missing_holiday_rows=int(daily["is_public_holiday"].isna().sum()),
                data_origin="synthetic_demo",
            ),
            supply=SupplyQuality(
                rows=len(supply),
                columns=len(supply.columns),
                data_origin="synthetic_demo",
            ),
            hourly_demand=HourlyDemandQuality(
                rows=len(hourly),
                columns=len(hourly.columns),
                stations=int(hourly["station_id"].nunique()),
                period_start=str(hourly["date"].min()),
                period_end=str(hourly["date"].max()),
                data_origin="synthetic_demo",
            ),
        )

        # Baseline evaluation constants from chronological validation
        baseline_eval = BaselineEvaluationQuality(
            model="28-day rolling mean",
            evaluation_type="chronological",
            train_end="2025-10-02",
            test_start="2025-10-03",
            test_end="2025-12-31",
            test_station_days=990,
            mae_kg=150.55,
            rmse_kg=189.69,
            smape_pct=11.41,
            data_origin="synthetic_demo",
            note="Synthetic simulation metrics only. Not real-world forecast accuracy.",
        )

        gaps = [DataGapItem(**g) for g in CANONICAL_DATA_GAPS]

        return DataQualityResponse(
            generated_at=now_utc,
            station_inventory=inventory_quality,
            synthetic_data=synthetic_quality,
            baseline_evaluation=baseline_eval,
            data_gaps=gaps,
        )

