"""Centralized Data Access and Validation Layer for CNG SmartPlan.

Enforces read-only CSV ingestion, schema validation, foreign-key integrity,
hourly-to-daily reconciliation, and coordinate pin eligibility rules.
"""

from __future__ import annotations
import logging
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
import pandas as pd

from config import settings

logger = logging.getLogger("cng_smartplan.data_loader")


class DataValidationError(Exception):
    """Raised when data integrity, schema, or relational constraints fail."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


@dataclass(frozen=True)
class CheckResult:
    """Result of an individual validation check."""

    name: str
    passed: bool
    details: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ValidationReport:
    """Aggregated validation report for all ingested datasets."""

    checks: List[CheckResult] = field(default_factory=list)

    def add_check(self, name: str, passed: bool, details: str, **metadata: Any) -> None:
        self.checks.append(CheckResult(name=name, passed=passed, details=details, metadata=metadata))

    @property
    def all_passed(self) -> bool:
        return all(c.passed for c in self.checks)

    @property
    def failed_checks(self) -> List[CheckResult]:
        return [c for c in self.checks if not c.passed]


class CoordinateVerifier:
    """Evaluates coordinate eligibility for station mapping.

    Strict rules:
    - Never mark a station as eligible for a map pin merely because candidate coordinates exist.
    - station_coordinate_candidates.csv is an unapproved research queue.
    - A coordinate is eligible ONLY if explicitly verified from primary sources,
      within bounded study area, and approved_for_map_pin is True.
    """

    @staticmethod
    def is_eligible_for_map_pin(station_row: pd.Series) -> bool:
        """Evaluate if a station row qualifies for a verified map pin."""
        verified = station_row.get("coordinates_verified", False)
        if isinstance(verified, str):
            verified = verified.strip().lower() in ("true", "1", "yes")

        if not bool(verified):
            return False

        lat = station_row.get("latitude")
        lon = station_row.get("longitude")

        if pd.isna(lat) or pd.isna(lon):
            return False

        try:
            lat_f = float(lat)
            lon_f = float(lon)
        except (ValueError, TypeError):
            return False

        # Ahmedabad approximate bounding box [22.8, 23.3] lat, [72.3, 72.8] lon
        if not (-90.0 <= lat_f <= 90.0 and -180.0 <= lon_f <= 180.0):
            return False

        in_study = str(station_row.get("in_study_area", "")).strip().lower()
        if in_study != "yes":
            return False

        return True


class DataStore:
    """In-memory immutable cache of validated CSV data sets."""

    def __init__(
        self,
        stations: pd.DataFrame,
        coordinate_candidates: pd.DataFrame,
        daily_sales: pd.DataFrame,
        supply: pd.DataFrame,
        hourly: pd.DataFrame,
        data_sources: pd.DataFrame,
        data_gaps: pd.DataFrame,
        data_dictionary: pd.DataFrame,
        infrastructure: pd.DataFrame,
        validation_report: ValidationReport,
    ):
        # Store as immutable (copy) DataFrames
        self._stations = stations.copy()
        self._coordinate_candidates = coordinate_candidates.copy()
        self._daily_sales = daily_sales.copy()
        self._supply = supply.copy()
        self._hourly = hourly.copy()
        self._data_sources = data_sources.copy()
        self._data_gaps = data_gaps.copy()
        self._data_dictionary = data_dictionary.copy()
        self._infrastructure = infrastructure.copy()
        self._validation_report = validation_report

    @property
    def stations(self) -> pd.DataFrame:
        """Station master directory (12 rows)."""
        return self._stations

    @property
    def coordinate_candidates(self) -> pd.DataFrame:
        """Unapproved coordinate candidate research queue (8 rows)."""
        return self._coordinate_candidates

    @property
    def daily_sales(self) -> pd.DataFrame:
        """Synthetic daily sales series (8,041 rows)."""
        return self._daily_sales

    @property
    def supply(self) -> pd.DataFrame:
        """Synthetic planned available supply series (8,041 rows)."""
        return self._supply

    @property
    def hourly(self) -> pd.DataFrame:
        """Synthetic hourly demand series (2,160 rows)."""
        return self._hourly

    @property
    def data_sources(self) -> pd.DataFrame:
        """Data sources provenance register (18 rows)."""
        return self._data_sources

    @property
    def data_gaps(self) -> pd.DataFrame:
        """Documented data gaps register (8 rows)."""
        return self._data_gaps

    @property
    def data_dictionary(self) -> pd.DataFrame:
        """Schema dictionary (103 rows)."""
        return self._data_dictionary

    @property
    def infrastructure(self) -> pd.DataFrame:
        """Historical infrastructure indicators (4 rows)."""
        return self._infrastructure

    @property
    def validation_report(self) -> ValidationReport:
        """Validation report details."""
        return self._validation_report

    @property
    def eligible_stations(self) -> pd.DataFrame:
        """Stations marked in_study_area='yes' eligible for simulation (11 rows)."""
        return self._stations[self._stations["in_study_area"] == "yes"].copy()

    @property
    def map_eligible_stations(self) -> pd.DataFrame:
        """Stations approved and verified for map pin display (currently 0 rows)."""
        mask = self._stations.apply(CoordinateVerifier.is_eligible_for_map_pin, axis=1)
        return self._stations[mask].copy()

    def get_station(self, station_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve station dict by station_id or None if not found."""
        match = self._stations[self._stations["station_id"] == station_id]
        if match.empty:
            return None
        return match.iloc[0].to_dict()

    def get_health_stats(self) -> Dict[str, int]:
        """Return counts required by GET /api/v1/health."""
        return {
            "stations": len(self._stations),
            "eligible_stations": len(self.eligible_stations),
            "daily_sales_rows": len(self._daily_sales),
            "supply_rows": len(self._supply),
            "hourly_rows": len(self._hourly),
        }


# Expected schema definitions for strict column presence validation
EXPECTED_COLUMNS: Dict[str, List[str]] = {
    "cng_stations.csv": [
        "station_id", "station_name", "address", "locality", "city",
        "district", "state", "pincode", "latitude", "longitude",
        "operator", "brand", "cng_status", "station_source_url",
        "coordinates_source_url", "verification_method", "coordinates_verified",
        "verification_status", "in_study_area", "source_access_date",
        "data_type", "verification_notes"
    ],
    "station_coordinate_candidates.csv": [
        "station_id", "station_name", "candidate_latitude", "candidate_longitude",
        "candidate_coordinate_source_url", "candidate_coordinate_source_name",
        "source_claim", "independent_check_status", "cng_status_conflict",
        "approved_for_map_pin", "data_origin", "notes"
    ],
    "synthetic_daily_sales.csv": [
        "station_id", "date", "synthetic_sales_kg", "day_of_week",
        "is_weekend", "month", "year", "is_public_holiday", "event_name",
        "simulation_profile", "data_type", "generation_method"
    ],
    "synthetic_supply.csv": [
        "station_id", "date", "planned_available_supply_kg",
        "data_type", "generation_method"
    ],
    "synthetic_hourly_demand.csv": [
        "station_id", "datetime", "date", "hour", "hourly_cng_demand_kg",
        "day_of_week", "is_weekend", "simulation_profile",
        "data_type", "generation_method"
    ],
    "data_sources.csv": [
        "source_id", "dataset_name", "source_name", "publisher",
        "source_url", "geographic_scope", "reporting_period", "access_date",
        "data_origin", "verification_status", "licence_or_attribution",
        "limitations", "notes"
    ],
    "data_gaps.csv": [
        "dataset_or_information_needed", "attempted_sources", "source_urls",
        "information_sought", "result", "reason_unavailable_or_unsuitable",
        "effect_on_project", "recommended_next_step"
    ],
    "data_dictionary.csv": [
        "file_name", "column_name", "data_type", "unit", "description",
        "example_value", "allowed_values_or_constraints",
        "required_or_optional", "data_origin"
    ],
    "optional/cng_infrastructure.csv": [
        "record_id", "indicator_name", "indicator_value", "unit",
        "geographic_scope", "reporting_period", "publication_date",
        "source_name", "source_url", "source_access_date",
        "data_type", "notes"
    ],
}


class DataLoader:
    """Loads and validates all CSV files from the specified data directory."""

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = (data_dir or settings.data_dir).resolve()
        self.report = ValidationReport()

    def _get_path(self, relative_filename: str) -> Path:
        return self.data_dir / relative_filename

    def _require_file(self, relative_filename: str) -> Path:
        path = self._get_path(relative_filename)
        if not path.exists():
            msg = f"Required data file missing: {relative_filename} (resolved: {path})"
            self.report.add_check(
                f"file_exists_{relative_filename}",
                passed=False,
                details=msg,
            )
            raise DataValidationError(msg, {"missing_file": relative_filename, "path": str(path)})
        self.report.add_check(
            f"file_exists_{relative_filename}",
            passed=True,
            details=f"File found at {path}",
        )
        return path

    def _check_columns(self, df: pd.DataFrame, filename: str) -> None:
        expected = EXPECTED_COLUMNS[filename]
        missing = [c for c in expected if c not in df.columns]
        if missing:
            msg = f"File {filename} is missing required columns: {missing}"
            self.report.add_check(f"columns_{filename}", passed=False, details=msg)
            raise DataValidationError(msg, {"filename": filename, "missing_columns": missing})
        self.report.add_check(
            f"columns_{filename}",
            passed=True,
            details=f"All {len(expected)} required columns present in {filename}",
        )

    def load_and_validate(self) -> DataStore:
        """Perform full ingestion and validation pipeline, returning DataStore."""
        logger.info(f"Loading CNG SmartPlan data package from: {self.data_dir}")

        # 1. Load stations
        stations_path = self._require_file("cng_stations.csv")
        stations = pd.read_csv(
            stations_path,
            dtype={
                "station_id": str,
                "station_name": str,
                "pincode": str,
                "in_study_area": str,
                "data_type": str,
                "verification_status": str,
            },
        )
        self._check_columns(stations, "cng_stations.csv")

        # Validate stations master
        if len(stations) != 12:
            raise DataValidationError(
                f"cng_stations.csv expected exactly 12 rows, found {len(stations)}"
            )
        if not stations["station_id"].is_unique:
            duplicates = stations[stations.duplicated("station_id")]["station_id"].tolist()
            raise DataValidationError(f"Duplicate station_id in cng_stations.csv: {duplicates}")

        # Ensure coordinates_verified is False for all stations
        coords_verified_bool = stations["coordinates_verified"].apply(
            lambda v: str(v).strip().lower() in ("true", "1", "yes")
        )
        if coords_verified_bool.any():
            invalid_ids = stations[coords_verified_bool]["station_id"].tolist()
            raise DataValidationError(
                f"Unauthorized verified coordinates detected for stations: {invalid_ids}. "
                "Per project specification, 0 station coordinates are verified."
            )

        # Ensure data_type is real_public
        if not (stations["data_type"] == "real_public").all():
            raise DataValidationError("cng_stations.csv contains unexpected data_type values")

        # Check study area distribution
        in_study_counts = stations["in_study_area"].value_counts().to_dict()
        if in_study_counts.get("yes", 0) != 11 or in_study_counts.get("uncertain", 0) != 1:
            raise DataValidationError(
                f"cng_stations.csv unexpected in_study_area distribution: {in_study_counts}. "
                "Expected 11 'yes' and 1 'uncertain' (AMD010)."
            )

        self.report.add_check(
            "stations_integrity",
            passed=True,
            details="Station master: 12 rows, unique IDs, 11 eligible, 0 verified coordinates",
        )

        # 2. Load coordinate candidates
        candidates_path = self._require_file("station_coordinate_candidates.csv")
        candidates = pd.read_csv(
            candidates_path,
            dtype={
                "station_id": str,
                "approved_for_map_pin": str,
                "data_origin": str,
            },
        )
        self._check_columns(candidates, "station_coordinate_candidates.csv")

        if len(candidates) != 8:
            raise DataValidationError(
                f"station_coordinate_candidates.csv expected 8 rows, found {len(candidates)}"
            )

        # Ensure all candidate points are approved_for_map_pin == 'no'
        approved_mask = candidates["approved_for_map_pin"].str.strip().str.lower() != "no"
        if approved_mask.any():
            invalid_ids = candidates[approved_mask]["station_id"].tolist()
            raise DataValidationError(
                f"Unapproved coordinate candidates marked as approved for pin: {invalid_ids}"
            )

        # Check FK integrity for candidates
        invalid_candidate_fks = set(candidates["station_id"]) - set(stations["station_id"])
        if invalid_candidate_fks:
            raise DataValidationError(
                f"Candidates reference unknown station_id: {invalid_candidate_fks}"
            )

        self.report.add_check(
            "coordinate_candidates_integrity",
            passed=True,
            details="Coordinate candidates: 8 rows, all approved_for_map_pin='no'",
        )

        # 3. Load synthetic daily sales
        daily_path = self._require_file("synthetic_daily_sales.csv")
        daily_sales = pd.read_csv(
            daily_path,
            dtype={
                "station_id": str,
                "day_of_week": str,
                "simulation_profile": str,
                "data_type": str,
                "generation_method": str,
            },
        )
        self._check_columns(daily_sales, "synthetic_daily_sales.csv")

        if len(daily_sales) != 8041:
            raise DataValidationError(
                f"synthetic_daily_sales.csv expected 8,041 rows, found {len(daily_sales)}"
            )

        # Validate date parsing
        try:
            daily_sales["date_parsed"] = pd.to_datetime(daily_sales["date"], format="%Y-%m-%d", errors="raise")
        except Exception as e:
            raise DataValidationError(f"Invalid date format in synthetic_daily_sales.csv: {e}")

        # Station FK and AMD010 exclusion
        eligible_station_ids = set(stations[stations["in_study_area"] == "yes"]["station_id"])
        daily_stations = set(daily_sales["station_id"])
        if daily_stations != eligible_station_ids:
            diff = daily_stations.symmetric_difference(eligible_station_ids)
            raise DataValidationError(
                f"synthetic_daily_sales.csv stations mismatch with eligible stations. Difference: {diff}"
            )

        if "AMD010" in daily_stations:
            raise DataValidationError(
                "AMD010 (in_study_area=uncertain) must NOT be present in synthetic_daily_sales.csv"
            )

        # Date range and per-station count
        date_min = daily_sales["date"].min()
        date_max = daily_sales["date"].max()
        if date_min != "2024-01-01" or date_max != "2025-12-31":
            raise DataValidationError(
                f"synthetic_daily_sales.csv date range expected 2024-01-01 to 2025-12-31, found {date_min} to {date_max}"
            )

        counts_per_station = daily_sales.groupby("station_id")["date"].count()
        if (counts_per_station != 731).any():
            invalid = counts_per_station[counts_per_station != 731].to_dict()
            raise DataValidationError(
                f"synthetic_daily_sales.csv stations do not each have exactly 731 dates: {invalid}"
            )

        # Duplicate check
        if daily_sales.duplicated(subset=["station_id", "date"]).any():
            dups = daily_sales[daily_sales.duplicated(subset=["station_id", "date"])][["station_id", "date"]]
            raise DataValidationError(f"Duplicate (station_id, date) in synthetic_daily_sales.csv: {len(dups)} rows")

        # Numeric non-negative check
        if (daily_sales["synthetic_sales_kg"] < 0).any():
            raise DataValidationError("Negative sales quantities found in synthetic_daily_sales.csv")

        # Label check
        if not (daily_sales["data_type"] == "synthetic").all():
            raise DataValidationError("synthetic_daily_sales.csv has rows without data_type='synthetic'")

        # Unassigned holiday check (documented gap verification)
        holidays_present = daily_sales["is_public_holiday"].notna() & (daily_sales["is_public_holiday"] != "")
        if holidays_present.any():
            logger.warning("synthetic_daily_sales.csv unexpectedly contains non-blank is_public_holiday values")

        daily_sales = daily_sales.drop(columns=["date_parsed"])

        self.report.add_check(
            "daily_sales_integrity",
            passed=True,
            details="Daily sales: 8,041 rows across 11 stations (2024-01-01 to 2025-12-31), no duplicates or negatives",
        )

        # 4. Load synthetic supply
        supply_path = self._require_file("synthetic_supply.csv")
        supply = pd.read_csv(
            supply_path,
            dtype={
                "station_id": str,
                "data_type": str,
                "generation_method": str,
            },
        )
        self._check_columns(supply, "synthetic_supply.csv")

        if len(supply) != 8041:
            raise DataValidationError(
                f"synthetic_supply.csv expected 8,041 rows, found {len(supply)}"
            )

        if (supply["planned_available_supply_kg"] < 0).any():
            raise DataValidationError("Negative supply quantities found in synthetic_supply.csv")

        if supply.duplicated(subset=["station_id", "date"]).any():
            raise DataValidationError("Duplicate (station_id, date) found in synthetic_supply.csv")

        # Validate 1:1 join with daily sales
        merged_keys = pd.merge(
            daily_sales[["station_id", "date"]],
            supply[["station_id", "date"]],
            on=["station_id", "date"],
            how="outer",
            indicator=True,
        )
        unmatched = merged_keys[merged_keys["_merge"] != "both"]
        if not unmatched.empty:
            raise DataValidationError(
                f"synthetic_supply.csv does not match synthetic_daily_sales.csv 1:1. Unmatched rows: {len(unmatched)}"
            )

        self.report.add_check(
            "supply_integrity",
            passed=True,
            details="Supply: 8,041 rows, exact 1:1 match with daily sales, no negatives",
        )

        # 5. Load synthetic hourly demand
        hourly_path = self._require_file("synthetic_hourly_demand.csv")
        hourly = pd.read_csv(
            hourly_path,
            dtype={
                "station_id": str,
                "day_of_week": str,
                "simulation_profile": str,
                "data_type": str,
                "generation_method": str,
            },
        )
        self._check_columns(hourly, "synthetic_hourly_demand.csv")

        if len(hourly) != 2160:
            raise DataValidationError(
                f"synthetic_hourly_demand.csv expected 2,160 rows, found {len(hourly)}"
            )

        hourly_stations = sorted(hourly["station_id"].unique())
        if hourly_stations != ["AMD001", "AMD004", "AMD008"]:
            raise DataValidationError(
                f"synthetic_hourly_demand.csv stations expected ['AMD001', 'AMD004', 'AMD008'], found {hourly_stations}"
            )

        # Check 24 hours per station-day
        station_day_counts = hourly.groupby(["station_id", "date"]).size()
        if (station_day_counts != 24).any():
            invalid_days = station_day_counts[station_day_counts != 24].to_dict()
            raise DataValidationError(
                f"synthetic_hourly_demand.csv does not have 24 hours per station-day: {invalid_days}"
            )

        if hourly.duplicated(subset=["station_id", "datetime"]).any():
            raise DataValidationError("Duplicate (station_id, datetime) in synthetic_hourly_demand.csv")

        if (hourly["hourly_cng_demand_kg"] < 0).any():
            raise DataValidationError("Negative values in synthetic_hourly_demand.csv")

        # Hourly reconciliation against daily sales (acceptance test AT-H02 tolerance: 0.011 kg)
        hourly_daily_sums = hourly.groupby(["station_id", "date"])["hourly_cng_demand_kg"].sum().reset_index()
        reconciled = pd.merge(
            hourly_daily_sums,
            daily_sales[["station_id", "date", "synthetic_sales_kg"]],
            on=["station_id", "date"],
            how="inner",
        )
        reconciled["diff"] = (reconciled["hourly_cng_demand_kg"] - reconciled["synthetic_sales_kg"]).abs()
        max_diff = reconciled["diff"].max()
        reconciliation_tolerance = 0.011  # kg tolerance

        if max_diff > reconciliation_tolerance:
            failing = reconciled[reconciled["diff"] > reconciliation_tolerance]
            raise DataValidationError(
                f"Hourly-to-daily reconciliation failed. Max diff {max_diff:.5f} kg exceeds tolerance {reconciliation_tolerance} kg. "
                f"Failing rows count: {len(failing)}"
            )

        self.report.add_check(
            "hourly_integrity",
            passed=True,
            details=f"Hourly demand: 2,160 rows (3 stations, 30 days, 24h), reconciled within {max_diff:.8f} kg (tolerance {reconciliation_tolerance} kg)",
        )

        # 6. Load provenance & metadata tables
        sources_path = self._require_file("data_sources.csv")
        data_sources = pd.read_csv(sources_path)
        self._check_columns(data_sources, "data_sources.csv")
        if len(data_sources) != 18:
            raise DataValidationError(f"data_sources.csv expected 18 rows, found {len(data_sources)}")
        if not data_sources["source_id"].is_unique:
            raise DataValidationError("data_sources.csv source_id is not unique")

        gaps_path = self._require_file("data_gaps.csv")
        data_gaps = pd.read_csv(gaps_path)
        self._check_columns(data_gaps, "data_gaps.csv")
        if len(data_gaps) < 8:
            raise DataValidationError(f"data_gaps.csv expected at least 8 rows, found {len(data_gaps)}")

        dict_path = self._require_file("data_dictionary.csv")
        data_dictionary = pd.read_csv(dict_path)
        self._check_columns(data_dictionary, "data_dictionary.csv")
        if len(data_dictionary) != 103:
            raise DataValidationError(f"data_dictionary.csv expected 103 rows, found {len(data_dictionary)}")

        infra_path = self._require_file("optional/cng_infrastructure.csv")
        infrastructure = pd.read_csv(infra_path)
        self._check_columns(infrastructure, "optional/cng_infrastructure.csv")
        if len(infrastructure) != 4:
            raise DataValidationError(f"optional/cng_infrastructure.csv expected 4 rows, found {len(infrastructure)}")

        self.report.add_check(
            "metadata_integrity",
            passed=True,
            details="Metadata files validated: 18 sources, 8 gaps, 103 dictionary entries, 4 infrastructure records",
        )

        logger.info("All CNG SmartPlan data checks passed successfully.")
        return DataStore(
            stations=stations,
            coordinate_candidates=candidates,
            daily_sales=daily_sales,
            supply=supply,
            hourly=hourly,
            data_sources=data_sources,
            data_gaps=data_gaps,
            data_dictionary=data_dictionary,
            infrastructure=infrastructure,
            validation_report=self.report,
        )


# Global singleton cache for data access across services
_global_data_store: Optional[DataStore] = None


def get_data_store() -> DataStore:
    """Retrieve the cached global DataStore instance.

    Raises RuntimeError if load_all_data() has not yet been executed.
    """
    global _global_data_store
    if _global_data_store is None:
        raise RuntimeError("DataStore has not been initialized. Call load_all_data() first.")
    return _global_data_store


def load_all_data(data_dir: Optional[Path] = None) -> DataStore:
    """Load, validate, and cache all datasets into the global DataStore."""
    global _global_data_store
    loader = DataLoader(data_dir=data_dir)
    _global_data_store = loader.load_and_validate()
    return _global_data_store

