"""Supply check service comparing forecast demand against planned supply or user overrides."""

from typing import Dict, List, Optional
from fastapi import HTTPException, status
import pandas as pd

from schemas.forecast import ForecastRequest
from schemas.supply import (
    SupplyCheckRequest,
    SupplyCheckResponse,
    SupplyComparisonPoint,
    SupplySummary,
)
from services.data_loader import get_data_store
from services.forecast_service import ForecastService
from services.station_service import StationService


class SupplyService:
    """Service for calculating potential supply shortfalls."""

    @classmethod
    def check_supply(cls, request: SupplyCheckRequest) -> SupplyCheckResponse:
        """Run supply-versus-demand comparison per docs/API_CONTRACT.md Section 3."""
        station_id = request.station_id
        horizon = request.horizon_days

        station_meta = StationService.get_station_by_id(station_id)
        if not station_meta:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "STATION_NOT_FOUND",
                    "message": f"No station with ID {station_id} exists in the inventory.",
                    "fields": None,
                },
            )

        if not station_meta["eligible_for_simulation"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "STATION_NOT_FOUND",
                    "message": f"Station {station_id} is excluded from supply planning simulation.",
                    "fields": None,
                },
            )

        # 1. Obtain demand forecast for station and horizon
        fc_req = ForecastRequest(
            station_id=station_id,
            horizon_days=horizon,
            model="holt_winters",
            include_baseline=False,
        )
        fc_res = ForecastService.generate_forecast(fc_req)

        store = get_data_store()
        supply_df = store.supply
        station_supply = supply_df[supply_df["station_id"] == station_id]
        supply_lookup = dict(zip(station_supply["date"], station_supply["planned_available_supply_kg"]))

        # Build user override lookup
        user_overrides: Dict[str, float] = {}
        if request.user_supply_overrides:
            for item in request.user_supply_overrides:
                user_overrides[item.date] = float(item.supply_kg)

        comparison_points: List[SupplyComparisonPoint] = []
        shortfall_days_count = 0
        max_shortfall = 0.0
        total_shortfall = 0.0
        days_covered = 0
        days_missing_supply = 0
        active_user_overrides_count = 0
        dates_requiring_override: List[str] = []

        for pt in fc_res.forecast:
            d = pt.date
            f_demand = pt.forecast_demand_kg

            if d in user_overrides:
                # User explicit override
                p_supply = round(user_overrides[d], 1)
                origin = "user_entered_scenario"
                shortfall = round(max(0.0, f_demand - p_supply), 1)
                has_shortfall = shortfall > 0.0
                supply_status = "shortfall" if has_shortfall else "user_override"
                days_covered += 1
                active_user_overrides_count += 1

                if has_shortfall:
                    shortfall_days_count += 1
                    max_shortfall = max(max_shortfall, shortfall)
                    total_shortfall += shortfall

            elif d in supply_lookup:
                # Historical / synthetic date match
                p_supply = round(float(supply_lookup[d]), 1)
                origin = "synthetic_demo"
                shortfall = round(max(0.0, f_demand - p_supply), 1)
                has_shortfall = shortfall > 0.0
                supply_status = "shortfall" if has_shortfall else "covered"
                days_covered += 1

                if has_shortfall:
                    shortfall_days_count += 1
                    max_shortfall = max(max_shortfall, shortfall)
                    total_shortfall += shortfall

            else:
                # Date beyond synthetic range without user override (e.g. 2026 dates)
                p_supply = None
                origin = "unavailable"
                shortfall = None
                has_shortfall = None
                supply_status = "unavailable"
                days_missing_supply += 1
                dates_requiring_override.append(d)

            comparison_points.append(
                SupplyComparisonPoint(
                    date=d,
                    forecast_demand_kg=f_demand,
                    planned_supply_kg=p_supply,
                    supply_data_origin=origin,
                    potential_shortfall_kg=shortfall,
                    has_shortfall=has_shortfall,
                    supply_status=supply_status,
                )
            )

        return SupplyCheckResponse(
            station_id=station_id,
            station_name=station_meta["station_name"],
            data_origin="synthetic_demo",
            supply_source=request.supply_source,
            comparison=comparison_points,
            summary=SupplySummary(
                days_with_shortfall=shortfall_days_count,
                max_shortfall_kg=round(max_shortfall, 1),
                total_shortfall_kg=round(total_shortfall, 1),
                days_covered=days_covered,
                days_missing_supply=days_missing_supply,
                active_user_overrides_count=active_user_overrides_count,
                dates_requiring_override=dates_requiring_override,
                alert_label="Potential Planning Shortfall",
            ),
            warnings=[
                "Synthetic supply covers only 2024-01-01 to 2025-12-31. Forecast dates beyond this require user-entered supply values.",
                "These are potential planning shortfalls, not confirmed stockouts.",
            ],
        )
