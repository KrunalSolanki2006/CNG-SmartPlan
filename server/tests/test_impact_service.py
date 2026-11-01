"""Unit and integration tests for the New-Station Impact Simulator (Feature E).

Governed by docs/API_CONTRACT.md, docs/PROJECT_SPEC.md, and Milestone 5 tasks.
"""

import pytest
from fastapi.testclient import TestClient

from main import app
from schemas.impact import ImpactSimulatorRequest
from services.impact_service import ImpactService


@pytest.fixture(scope="module")
def client():
    """Create test client for endpoint testing."""
    return TestClient(app)


def test_impact_simulation_canonical_example_arithmetic():
    """Verify exact calculation from canonical docs/API_CONTRACT.md example.

    catchment_demand = 5000 kg/day
    capture_proportion = 0.35
    diversion_proportion = 0.60
    accessibility_demand = 0.0 kg/day

    Expected:
    proposed = 5000 * 0.35 + 0 = 1750.0 kg/day
    diverted = 1750 * 0.60 = 1050.0 kg/day
    net_additional = 1750 - 1050 = 700.0 kg/day
    """
    req = ImpactSimulatorRequest(
        proposed_latitude=23.05,
        proposed_longitude=72.60,
        catchment_radius_km=3.0,
        catchment_demand_kg_per_day=5000.0,
        capture_proportion=0.35,
        diversion_proportion=0.60,
        accessibility_demand_kg_per_day=0.0,
    )
    resp = ImpactService.simulate_impact(req)

    assert resp.data_origin == "illustrative_scenario"
    assert resp.results.proposed_station_demand_kg_per_day == pytest.approx(1750.0)
    assert resp.results.estimated_diverted_demand_kg_per_day == pytest.approx(1050.0)
    assert resp.results.net_additional_network_demand_kg_per_day == pytest.approx(700.0)

    # Geographic analysis unavailable
    assert resp.geographic_analysis.available is False
    assert resp.geographic_analysis.nearby_stations is None
    assert "No stations have independently verified coordinates" in resp.geographic_analysis.reason

    # Formulas applied transparent strings
    assert "catchment_demand_kg_per_day * capture_proportion" in resp.formulas_applied.proposed_station_demand
    assert "proposed_station_demand_kg_per_day * diversion_proportion" in resp.formulas_applied.estimated_diverted_demand
    assert "proposed_station_demand_kg_per_day - estimated_diverted_demand_kg_per_day" in resp.formulas_applied.net_additional_network_demand

    # Canonical caveats present
    assert len(resp.warnings) >= 3
    assert any("Illustrative scenario" in w for w in resp.warnings)
    assert any("not evidence-backed" in w for w in resp.warnings)
    assert any("Nearby-station effects cannot be calculated" in w for w in resp.warnings)


def test_impact_simulation_with_accessibility_demand():
    """Verify formula handles non-zero accessibility-generated demand properly."""
    req = ImpactSimulatorRequest(
        proposed_latitude=23.05,
        proposed_longitude=72.60,
        catchment_radius_km=4.5,
        catchment_demand_kg_per_day=4000.0,
        capture_proportion=0.25,
        diversion_proportion=0.40,
        accessibility_demand_kg_per_day=500.0,
    )
    resp = ImpactService.simulate_impact(req)

    # proposed = (4000 * 0.25) + 500 = 1500.0
    # diverted = 1500 * 0.40 = 600.0
    # net_additional = 1500 - 600 = 900.0
    assert resp.results.proposed_station_demand_kg_per_day == pytest.approx(1500.0)
    assert resp.results.estimated_diverted_demand_kg_per_day == pytest.approx(600.0)
    assert resp.results.net_additional_network_demand_kg_per_day == pytest.approx(900.0)


def test_impact_simulation_zero_diversion_boundary():
    """When diversion proportion is 0.0, net additional equals proposed demand."""
    req = ImpactSimulatorRequest(
        proposed_latitude=23.05,
        proposed_longitude=72.60,
        catchment_radius_km=3.0,
        catchment_demand_kg_per_day=3000.0,
        capture_proportion=0.30,
        diversion_proportion=0.0,
        accessibility_demand_kg_per_day=100.0,
    )
    resp = ImpactService.simulate_impact(req)

    # proposed = 3000 * 0.30 + 100 = 1000.0
    # diverted = 1000 * 0.0 = 0.0
    # net_additional = 1000.0
    assert resp.results.proposed_station_demand_kg_per_day == pytest.approx(1000.0)
    assert resp.results.estimated_diverted_demand_kg_per_day == pytest.approx(0.0)
    assert resp.results.net_additional_network_demand_kg_per_day == pytest.approx(1000.0)


def test_impact_simulation_complete_diversion_boundary():
    """When diversion proportion is 1.0, net additional demand is 0.0."""
    req = ImpactSimulatorRequest(
        proposed_latitude=23.05,
        proposed_longitude=72.60,
        catchment_radius_km=3.0,
        catchment_demand_kg_per_day=2000.0,
        capture_proportion=0.50,
        diversion_proportion=1.0,
        accessibility_demand_kg_per_day=0.0,
    )
    resp = ImpactService.simulate_impact(req)

    # proposed = 2000 * 0.50 = 1000.0
    # diverted = 1000 * 1.0 = 1000.0
    # net_additional = 0.0
    assert resp.results.proposed_station_demand_kg_per_day == pytest.approx(1000.0)
    assert resp.results.estimated_diverted_demand_kg_per_day == pytest.approx(1000.0)
    assert resp.results.net_additional_network_demand_kg_per_day == pytest.approx(0.0)


def test_impact_simulation_outside_bbox_warning():
    """Candidate point outside Ahmedabad study area bounding box triggers an additional warning."""
    # Point in Mumbai (19.0760, 72.8777)
    req = ImpactSimulatorRequest(
        proposed_latitude=19.0760,
        proposed_longitude=72.8777,
        catchment_radius_km=3.0,
        catchment_demand_kg_per_day=5000.0,
        capture_proportion=0.35,
        diversion_proportion=0.60,
        accessibility_demand_kg_per_day=0.0,
    )
    resp = ImpactService.simulate_impact(req)

    assert any("outside the provisional Ahmedabad urban study area" in w for w in resp.warnings)


def test_impact_simulator_endpoint_success(client):
    """TestClient POST /api/v1/impact-simulator with canonical valid payload returns 200 OK."""
    payload = {
        "proposed_latitude": 23.05,
        "proposed_longitude": 72.60,
        "catchment_radius_km": 3.0,
        "catchment_demand_kg_per_day": 5000.0,
        "capture_proportion": 0.35,
        "diversion_proportion": 0.60,
        "accessibility_demand_kg_per_day": 0.0,
    }
    response = client.post("/api/v1/impact-simulator", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["data_origin"] == "illustrative_scenario"
    assert data["results"]["proposed_station_demand_kg_per_day"] == 1750.0
    assert data["results"]["estimated_diverted_demand_kg_per_day"] == 1050.0
    assert data["results"]["net_additional_network_demand_kg_per_day"] == 700.0
    assert data["geographic_analysis"]["available"] is False
    assert data["geographic_analysis"]["nearby_stations"] is None


def test_impact_simulator_validation_negative_demand(client):
    """catchment_demand_kg_per_day <= 0 must be rejected with 422 VALIDATION_ERROR."""
    payload = {
        "proposed_latitude": 23.05,
        "proposed_longitude": 72.60,
        "catchment_radius_km": 3.0,
        "catchment_demand_kg_per_day": -100.0,  # Invalid
        "capture_proportion": 0.35,
        "diversion_proportion": 0.60,
        "accessibility_demand_kg_per_day": 0.0,
    }
    response = client.post("/api/v1/impact-simulator", json=payload)
    assert response.status_code == 422
    err = response.json()
    assert err["error"]["code"] == "VALIDATION_ERROR"
    assert "body.catchment_demand_kg_per_day" in err["error"]["fields"]


def test_impact_simulator_validation_invalid_proportions(client):
    """Proportions outside [0.0, 1.0] must be rejected with 422."""
    payload = {
        "proposed_latitude": 23.05,
        "proposed_longitude": 72.60,
        "catchment_radius_km": 3.0,
        "catchment_demand_kg_per_day": 5000.0,
        "capture_proportion": 1.25,  # > 1.0
        "diversion_proportion": 0.60,
        "accessibility_demand_kg_per_day": 0.0,
    }
    response = client.post("/api/v1/impact-simulator", json=payload)
    assert response.status_code == 422
    err = response.json()
    assert err["error"]["code"] == "VALIDATION_ERROR"


def test_impact_simulator_validation_out_of_bounds_coords(client):
    """Latitudes outside [-90, 90] must be rejected with 422."""
    payload = {
        "proposed_latitude": 95.0,  # Invalid
        "proposed_longitude": 72.60,
        "catchment_radius_km": 3.0,
        "catchment_demand_kg_per_day": 5000.0,
        "capture_proportion": 0.35,
        "diversion_proportion": 0.60,
        "accessibility_demand_kg_per_day": 0.0,
    }
    response = client.post("/api/v1/impact-simulator", json=payload)
    assert response.status_code == 422
    err = response.json()
    assert err["error"]["code"] == "VALIDATION_ERROR"


def test_impact_simulator_extra_fields_forbidden(client):
    """Extra undeclared fields in payload must be rejected with 422 (extra='forbid')."""
    payload = {
        "proposed_latitude": 23.05,
        "proposed_longitude": 72.60,
        "catchment_radius_km": 3.0,
        "catchment_demand_kg_per_day": 5000.0,
        "capture_proportion": 0.35,
        "diversion_proportion": 0.60,
        "accessibility_demand_kg_per_day": 0.0,
        "unauthorized_field": "test_hack",
    }
    response = client.post("/api/v1/impact-simulator", json=payload)
    assert response.status_code == 422
    err = response.json()
    assert err["error"]["code"] == "VALIDATION_ERROR"



def test_impact_simulation_screenshot_benchmark_arithmetic_and_sensitivity():
    """Verify exact calculation from screenshot benchmark scenario (Defect 3.6):
    Capacity: 5000 kg/day, Capture: 81% (0.81), Diversion: 60% (0.60), Accessibility: 0 kg/day.
    Expected:
    proposed = 5000 * 0.81 + 0 = 4050.0 kg/day
    diverted = 4050 * 0.60 = 2430.0 kg/day
    net_additional = 4050 - 2430 = 1620.0 kg/day
    network_baseline = 14081.2 kg/day
    scenario_network = 15701.2 kg/day
    """
    req = ImpactSimulatorRequest(
        proposed_latitude=23.05,
        proposed_longitude=72.60,
        catchment_radius_km=3.0,
        catchment_demand_kg_per_day=5000.0,
        capture_proportion=0.81,
        diversion_proportion=0.60,
        accessibility_demand_kg_per_day=0.0,
    )
    resp = ImpactService.simulate_impact(req)

    assert resp.results.proposed_station_demand_kg_per_day == pytest.approx(4050.0)
    assert resp.results.estimated_diverted_demand_kg_per_day == pytest.approx(2430.0)
    assert resp.results.net_additional_network_demand_kg_per_day == pytest.approx(1620.0)
    assert resp.results.network_baseline_daily_demand_kg == pytest.approx(14081.2)
    assert resp.results.scenario_network_daily_demand_kg == pytest.approx(15701.2)

    # Check sensitivity analysis grid
    assert resp.sensitivity_analysis is not None
    assert len(resp.sensitivity_analysis) == 12  # 4 capture rates x 3 diversion rates
    # Check matching grid point
    pt_81_60 = next(
        p for p in resp.sensitivity_analysis
        if abs(p.capture_proportion - 0.81) < 0.001 and abs(p.diversion_proportion - 0.60) < 0.001
    )
    assert pt_81_60.proposed_station_demand_kg == pytest.approx(4050.0)
    assert pt_81_60.diverted_demand_kg == pytest.approx(2430.0)
    assert pt_81_60.net_additional_demand_kg == pytest.approx(1620.0)
