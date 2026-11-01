"""Impact simulator service implementing Feature E (Signature Feature).

Governed strictly by docs/API_CONTRACT.md and docs/PROJECT_SPEC.md.
Rules:
- Transparent scenario arithmetic from user-supplied inputs.
- Clearly marked illustrative scenario, not an empirical forecast or proven future sales.
- Geographic station-specific effects withheld due to lack of verified station coordinates.
- User proposed candidate location kept separate from master station records.
"""

import math
from typing import List
from schemas.impact import (
    GeographicAnalysis,
    ImpactAssumptions,
    ImpactFormulas,
    ImpactResults,
    ImpactSimulatorRequest,
    ImpactSimulatorResponse,
    SensitivityPoint,
)
from services.geo_service import GeoService


class ImpactService:
    """Service for calculating illustrative new-station impact scenarios."""

    NETWORK_BASELINE_DAILY_DEMAND_KG: float = 14081.2

    @classmethod
    def simulate_impact(
        cls,
        req: ImpactSimulatorRequest,
    ) -> ImpactSimulatorResponse:
        """Execute impact simulation formulas and construct response matching API_CONTRACT.md."""
        # 1. Floating-point arithmetic for the 3 transparent formulas
        proposed_demand = (
            req.catchment_demand_kg_per_day * req.capture_proportion
        ) + req.accessibility_demand_kg_per_day

        diverted_demand = proposed_demand * req.diversion_proportion

        net_additional = proposed_demand - diverted_demand

        baseline = cls.NETWORK_BASELINE_DAILY_DEMAND_KG
        scenario_network_total = round(baseline + net_additional, 2)

        # Round to 2 decimal places per specification
        results = ImpactResults(
            proposed_station_demand_kg_per_day=round(proposed_demand, 2),
            estimated_diverted_demand_kg_per_day=round(diverted_demand, 2),
            net_additional_network_demand_kg_per_day=round(net_additional, 2),
            network_baseline_daily_demand_kg=baseline,
            scenario_network_daily_demand_kg=scenario_network_total,
        )

        assumptions = ImpactAssumptions(
            proposed_latitude=float(req.proposed_latitude),
            proposed_longitude=float(req.proposed_longitude),
            catchment_radius_km=float(req.catchment_radius_km),
            catchment_demand_kg_per_day=float(req.catchment_demand_kg_per_day),
            capture_proportion=float(req.capture_proportion),
            diversion_proportion=float(req.diversion_proportion),
            accessibility_demand_kg_per_day=float(req.accessibility_demand_kg_per_day),
        )

        # Standard canonical warnings required by contract
        warnings: List[str] = [
            "Illustrative scenario calculation only. All inputs are user-supplied assumptions.",
            "Results are not evidence-backed predictions.",
            "Nearby-station effects cannot be calculated without verified station coordinates.",
        ]

        # Check whether candidate location is within provisional Ahmedabad study area
        in_bbox = GeoService.is_within_study_area_bbox(
            req.proposed_latitude, req.proposed_longitude
        )
        if not in_bbox:
            warnings.append(
                f"Proposed coordinates ({req.proposed_latitude}, {req.proposed_longitude}) lie outside "
                "the provisional Ahmedabad urban study area bounding box [22.80, 23.30] N, [72.30, 72.80] E."
            )

        geographic_analysis = GeographicAnalysis(
            available=False,
            reason=(
                "No stations have independently verified coordinates. "
                "Nearby-station analysis cannot be performed."
            ),
            nearby_stations=None,
        )

        # Multi-scenario sensitivity analysis grid (varying capture & diversion)
        capture_rates = [0.20, 0.35, 0.50, 0.81]
        diversion_rates = [0.40, 0.60, 0.80]
        sensitivity_points: List[SensitivityPoint] = []

        for cap in capture_rates:
            for div in diversion_rates:
                p_dem = (req.catchment_demand_kg_per_day * cap) + req.accessibility_demand_kg_per_day
                d_dem = p_dem * div
                n_add = p_dem - d_dem
                sensitivity_points.append(
                    SensitivityPoint(
                        capture_proportion=cap,
                        diversion_proportion=div,
                        proposed_station_demand_kg=round(p_dem, 2),
                        diverted_demand_kg=round(d_dem, 2),
                        net_additional_demand_kg=round(n_add, 2),
                    )
                )

        return ImpactSimulatorResponse(
            data_origin="illustrative_scenario",
            assumptions=assumptions,
            results=results,
            formulas_applied=ImpactFormulas(),
            geographic_analysis=geographic_analysis,
            sensitivity_analysis=sensitivity_points,
            warnings=warnings,
        )
