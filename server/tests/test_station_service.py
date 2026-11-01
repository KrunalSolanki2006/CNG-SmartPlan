"""Unit tests for StationService."""

import pytest
from services.station_service import StationService


def test_get_all_stations():
    """Verify get_all_stations returns all 12 stations with default flags."""
    stations = StationService.get_all_stations()
    assert len(stations) == 12

    for s in stations:
        # Strict rules: 0 stations have verified coordinates
        assert s["coordinates_verified"] is False
        assert s["latitude"] is None
        assert s["longitude"] is None
        assert s["eligible_for_map_pin"] is False
        assert s["data_origin"] == "real_public"
        assert s["station_id"].startswith("AMD")


def test_get_eligible_stations():
    """Verify eligible stations query returns exactly 11 in_study_area='yes' stations."""
    eligible = StationService.get_eligible_stations()
    assert len(eligible) == 11

    station_ids = [s["station_id"] for s in eligible]
    assert "AMD010" not in station_ids
    for s in eligible:
        assert s["in_study_area"] == "yes"
        assert s["eligible_for_simulation"] is True


def test_get_station_by_id_found_and_not_found():
    """Verify get_station_by_id returns station dict or None."""
    station = StationService.get_station_by_id("AMD001")
    assert station is not None
    assert station["station_id"] == "AMD001"
    assert station["station_name"] == "Visat Automobile"
    assert station["simulation_profile"] == "commuter_corridor"

    missing = StationService.get_station_by_id("AMD999")
    assert missing is None

