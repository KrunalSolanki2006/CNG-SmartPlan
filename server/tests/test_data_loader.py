"""Comprehensive tests for data loading, schema validation, and coordinate rules."""

import shutil
from pathlib import Path
import pandas as pd
import pytest

from services.data_loader import (
    DataLoader,
    DataStore,
    DataValidationError,
    CoordinateVerifier,
    get_data_store,
)
from config import settings


def test_data_store_loaded():
    """Verify DataStore singleton is populated with expected row counts."""
    store = get_data_store()
    assert isinstance(store, DataStore)
    assert len(store.stations) == 12
    assert len(store.eligible_stations) == 11
    assert len(store.map_eligible_stations) == 0
    assert len(store.daily_sales) == 8041
    assert len(store.supply) == 8041
    assert len(store.hourly) == 2160
    assert len(store.data_sources) == 18
    assert len(store.data_gaps) >= 8
    assert len(store.data_dictionary) == 103
    assert len(store.infrastructure) == 4


def test_station_integrity():
    """Test station master constraints and AMD010 exclusion."""
    store = get_data_store()
    stations = store.stations

    # 12 unique station IDs
    assert stations["station_id"].is_unique
    assert len(stations["station_id"]) == 12

    # All data_type must be real_public
    assert (stations["data_type"] == "real_public").all()

    # Coordinates verified must be False for all stations
    assert (stations["coordinates_verified"] == False).all()
    assert stations["latitude"].isna().all()
    assert stations["longitude"].isna().all()

    # Check eligible vs excluded
    eligible_ids = set(store.eligible_stations["station_id"])
    assert len(eligible_ids) == 11
    assert "AMD010" not in eligible_ids

    # AMD010 is marked as uncertain
    amd010 = stations[stations["station_id"] == "AMD010"].iloc[0]
    assert amd010["in_study_area"] == "uncertain"


def test_coordinate_verifier_rules():
    """Test that CoordinateVerifier enforces strict eligibility rules."""
    # Base unverified station
    station = pd.Series({
        "station_id": "AMD001",
        "coordinates_verified": False,
        "latitude": 23.1157,
        "longitude": 72.5878,
        "in_study_area": "yes",
    })
    assert CoordinateVerifier.is_eligible_for_map_pin(station) is False

    # Station with blank coords
    station2 = pd.Series({
        "station_id": "AMD001",
        "coordinates_verified": True,
        "latitude": None,
        "longitude": None,
        "in_study_area": "yes",
    })
    assert CoordinateVerifier.is_eligible_for_map_pin(station2) is False

    # Station with out-of-bounds coords
    station3 = pd.Series({
        "station_id": "AMD001",
        "coordinates_verified": True,
        "latitude": 123.45,
        "longitude": 72.5878,
        "in_study_area": "yes",
    })
    assert CoordinateVerifier.is_eligible_for_map_pin(station3) is False

    # Station with in_study_area != yes
    station4 = pd.Series({
        "station_id": "AMD010",
        "coordinates_verified": True,
        "latitude": 23.05,
        "longitude": 72.55,
        "in_study_area": "uncertain",
    })
    assert CoordinateVerifier.is_eligible_for_map_pin(station4) is False

    # Valid verified station
    valid_station = pd.Series({
        "station_id": "AMD001",
        "coordinates_verified": True,
        "latitude": 23.05,
        "longitude": 72.55,
        "in_study_area": "yes",
    })
    assert CoordinateVerifier.is_eligible_for_map_pin(valid_station) is True


def test_candidate_coordinates_quarantine():
    """Verify that candidate coordinates are quarantined and none are approved."""
    store = get_data_store()
    candidates = store.coordinate_candidates
    assert len(candidates) == 8
    assert (candidates["approved_for_map_pin"] == "no").all()
    assert (candidates["data_origin"] == "secondary_coordinate_candidate").all()


def test_daily_sales_integrity():
    """Verify daily sales coverage, date range, and AMD010 absence."""
    store = get_data_store()
    daily = store.daily_sales

    assert len(daily) == 8041
    assert "AMD010" not in daily["station_id"].values

    # Exactly 11 stations
    assert daily["station_id"].nunique() == 11

    # Date range
    assert daily["date"].min() == "2024-01-01"
    assert daily["date"].max() == "2025-12-31"

    # No duplicates, no negatives
    assert not daily.duplicated(subset=["station_id", "date"]).any()
    assert (daily["synthetic_sales_kg"] >= 0).all()

    # Documented gap: holiday fields are all blank
    assert daily["is_public_holiday"].isna().all()
    assert daily["event_name"].isna().all()


def test_supply_integrity_and_one_to_one_join():
    """Verify supply dataset matches daily sales 1:1 with zero orphan keys."""
    store = get_data_store()
    supply = store.supply
    daily = store.daily_sales

    assert len(supply) == 8041
    assert (supply["planned_available_supply_kg"] >= 0).all()
    assert not supply.duplicated(subset=["station_id", "date"]).any()

    # 1:1 join verification
    merged = pd.merge(
        daily[["station_id", "date"]],
        supply[["station_id", "date"]],
        on=["station_id", "date"],
        how="outer",
        indicator=True,
    )
    assert (merged["_merge"] == "both").all()


def test_hourly_demand_integrity_and_reconciliation():
    """Verify hourly demand structure (24h/station-day) and daily reconciliation."""
    store = get_data_store()
    hourly = store.hourly
    daily = store.daily_sales

    assert len(hourly) == 2160
    assert sorted(hourly["station_id"].unique()) == ["AMD001", "AMD004", "AMD008"]
    assert hourly["date"].min() == "2025-12-02"
    assert hourly["date"].max() == "2025-12-31"

    # Exactly 24 rows per station-day
    counts = hourly.groupby(["station_id", "date"]).size()
    assert (counts == 24).all()

    # Reconcile sum to daily sales within 0.011 kg tolerance
    hourly_sums = hourly.groupby(["station_id", "date"])["hourly_cng_demand_kg"].sum().reset_index()
    reconciled = pd.merge(
        hourly_sums,
        daily[["station_id", "date", "synthetic_sales_kg"]],
        on=["station_id", "date"],
        how="inner",
    )
    assert len(reconciled) == 90  # 3 stations * 30 days
    max_diff = (reconciled["hourly_cng_demand_kg"] - reconciled["synthetic_sales_kg"]).abs().max()
    assert max_diff <= 0.011


def test_validation_failure_on_missing_file(tmp_path):
    """Test loader raises DataValidationError when a required file is missing."""
    # Copy all files except cng_stations.csv to tmp_path
    data_dir = settings.data_dir
    for f in data_dir.glob("*.csv"):
        if f.name != "cng_stations.csv":
            shutil.copy(f, tmp_path / f.name)

    loader = DataLoader(data_dir=tmp_path)
    with pytest.raises(DataValidationError) as exc_info:
        loader.load_and_validate()
    assert "cng_stations.csv" in str(exc_info.value)


def test_validation_failure_on_missing_column(tmp_path):
    """Test loader raises DataValidationError when required column is missing."""
    data_dir = settings.data_dir
    for f in data_dir.glob("*.csv"):
        shutil.copy(f, tmp_path / f.name)
    (tmp_path / "optional").mkdir()
    shutil.copy(data_dir / "optional" / "cng_infrastructure.csv", tmp_path / "optional")

    # Corrupt cng_stations.csv by dropping a column
    df = pd.read_csv(tmp_path / "cng_stations.csv")
    df = df.drop(columns=["station_name"])
    df.to_csv(tmp_path / "cng_stations.csv", index=False)

    loader = DataLoader(data_dir=tmp_path)
    with pytest.raises(DataValidationError) as exc_info:
        loader.load_and_validate()
    assert "station_name" in str(exc_info.value)


def test_validation_failure_on_duplicate_station_id(tmp_path):
    """Test loader raises DataValidationError when station_id is duplicated."""
    data_dir = settings.data_dir
    for f in data_dir.glob("*.csv"):
        shutil.copy(f, tmp_path / f.name)
    (tmp_path / "optional").mkdir()
    shutil.copy(data_dir / "optional" / "cng_infrastructure.csv", tmp_path / "optional")

    # Duplicate first row of cng_stations
    df = pd.read_csv(tmp_path / "cng_stations.csv")
    df.loc[1, "station_id"] = df.loc[0, "station_id"]
    df.to_csv(tmp_path / "cng_stations.csv", index=False)

    loader = DataLoader(data_dir=tmp_path)
    with pytest.raises(DataValidationError) as exc_info:
        loader.load_and_validate()
    assert "Duplicate station_id" in str(exc_info.value)


def test_validation_failure_on_negative_sales(tmp_path):
    """Test loader raises DataValidationError when sales quantity is negative."""
    data_dir = settings.data_dir
    for f in data_dir.glob("*.csv"):
        shutil.copy(f, tmp_path / f.name)
    (tmp_path / "optional").mkdir()
    shutil.copy(data_dir / "optional" / "cng_infrastructure.csv", tmp_path / "optional")

    df = pd.read_csv(tmp_path / "synthetic_daily_sales.csv")
    df.loc[0, "synthetic_sales_kg"] = -50.0
    df.to_csv(tmp_path / "synthetic_daily_sales.csv", index=False)

    loader = DataLoader(data_dir=tmp_path)
    with pytest.raises(DataValidationError) as exc_info:
        loader.load_and_validate()
    assert "Negative sales quantities" in str(exc_info.value)


def test_validation_failure_on_approved_coordinate_candidate(tmp_path):
    """Test loader raises DataValidationError if a candidate is falsely marked as approved."""
    data_dir = settings.data_dir
    for f in data_dir.glob("*.csv"):
        shutil.copy(f, tmp_path / f.name)
    (tmp_path / "optional").mkdir()
    shutil.copy(data_dir / "optional" / "cng_infrastructure.csv", tmp_path / "optional")

    df = pd.read_csv(tmp_path / "station_coordinate_candidates.csv")
    df.loc[0, "approved_for_map_pin"] = "yes"
    df.to_csv(tmp_path / "station_coordinate_candidates.csv", index=False)

    loader = DataLoader(data_dir=tmp_path)
    with pytest.raises(DataValidationError) as exc_info:
        loader.load_and_validate()
    assert "Unapproved coordinate candidates marked as approved" in str(exc_info.value)

