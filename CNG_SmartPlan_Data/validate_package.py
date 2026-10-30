#!/usr/bin/env python3
"""Validate CNG SmartPlan data files and write validation_report.md.

Run from any directory with: python validate_package.py
Dependencies: pandas, numpy
The validator distinguishes passed technical integrity checks from data-readiness
limitations. Passing does NOT imply the station inventory is complete or that
synthetic data represents real operations.
"""
from __future__ import annotations
from pathlib import Path
from datetime import date
import sys
import numpy as np
import pandas as pd

BASE = Path(__file__).resolve().parent
REPORT = BASE / "validation_report.md"
EXPECTED_START = "2024-01-01"
EXPECTED_END = "2025-12-31"
EXPECTED_HOURLY_START = "2025-12-02"
EXPECTED_HOURLY_END = "2025-12-31"
SEED = 20241029


def require(condition: bool, message: str) -> None:
    if not bool(condition):
        raise AssertionError(message)


def md_escape(value: object) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def main() -> None:
    checks: list[str] = []
    limitations: list[str] = []

    station_path = BASE / "cng_stations.csv"
    coord_path = BASE / "station_coordinate_candidates.csv"
    daily_path = BASE / "synthetic_daily_sales.csv"
    supply_path = BASE / "synthetic_supply.csv"
    hourly_path = BASE / "synthetic_hourly_demand.csv"
    sources_path = BASE / "data_sources.csv"
    gaps_path = BASE / "data_gaps.csv"
    dictionary_path = BASE / "data_dictionary.csv"
    infra_path = BASE / "optional" / "cng_infrastructure.csv"

    must_exist = [station_path, coord_path, daily_path, supply_path, hourly_path,
                  sources_path, gaps_path, dictionary_path, infra_path,
                  BASE / "README.md", BASE / "generate_synthetic_data.py"]
    missing_files = [p.relative_to(BASE).as_posix() for p in must_exist if not p.is_file()]
    require(not missing_files, f"Required package files missing: {missing_files}")
    checks.append(f"Required core files, scripts, README and optional infrastructure file exist ({len(must_exist)} files).")

    # Load all input files explicitly as UTF-8 through pandas.
    st = pd.read_csv(station_path, dtype=str, keep_default_na=False, encoding="utf-8")
    coord = pd.read_csv(coord_path, dtype=str, keep_default_na=False, encoding="utf-8")
    daily = pd.read_csv(daily_path, encoding="utf-8")
    supply = pd.read_csv(supply_path, encoding="utf-8")
    hourly = pd.read_csv(hourly_path, encoding="utf-8")
    src = pd.read_csv(sources_path, dtype=str, keep_default_na=False, encoding="utf-8")
    gaps = pd.read_csv(gaps_path, dtype=str, keep_default_na=False, encoding="utf-8")
    dictionary = pd.read_csv(dictionary_path, dtype=str, keep_default_na=False, encoding="utf-8")
    infra = pd.read_csv(infra_path, encoding="utf-8")

    # Station master provenance and geographic scope.
    station_required = {
        "station_id", "station_name", "address", "locality", "city", "district", "state",
        "latitude", "longitude", "operator", "brand", "cng_status", "station_source_url",
        "coordinates_source_url", "verification_method", "coordinates_verified",
        "verification_status", "in_study_area", "source_access_date", "data_type", "verification_notes"
    }
    require(station_required.issubset(st.columns), f"Station schema missing: {sorted(station_required-set(st.columns))}")
    require(st["station_id"].is_unique, "Station IDs are not unique")
    norm_names = st["station_name"].str.lower().str.replace(r"[^a-z0-9]", "", regex=True)
    require(norm_names.is_unique, "Potential duplicate normalized station names found; reconcile before delivery")
    require(st["data_type"].eq("real_public").all(), "Station master contains non-real_public rows")
    require(st["station_name"].str.strip().ne("").all() and st["address"].str.strip().ne("").all(), "Station name/address missing")
    require(st["station_source_url"].str.startswith("https://").all(), "Station row is missing an HTTPS source URL")
    require(st["coordinates_verified"].str.lower().eq("false").all(), "Unexpected coordinate-verified flag; review and update validator")
    require(st["latitude"].eq("").all() and st["longitude"].eq("").all(), "Unverified coordinates must remain blank in the primary master")
    require(st["coordinates_source_url"].eq("").all(), "Primary station master must not show a source for an unapproved coordinate")
    require(set(st["in_study_area"]).issubset({"yes", "no", "uncertain"}), "Invalid in_study_area value")
    require(st["verification_status"].str.lower().ne("verified").all(), "Station marked verified despite unresolved coordinate/boundary checks")
    eligible = st[st["in_study_area"].str.lower().eq("yes")].copy()
    require(len(eligible) > 0, "No locality-screened stations are eligible for a synthetic demo")
    require(st["source_access_date"].str.match(r"^\d{4}-\d{2}-\d{2}$").all(), "Bad station source access date format")
    checks.append(f"Station master: {len(st)} distinct source-backed directory records; {len(eligible)} locality-screened rows eligible for synthetic demonstration; no approved coordinates.")

    # Candidate coordinates are explicitly separate and barred from use as map pins.
    candidate_required = {"station_id", "candidate_latitude", "candidate_longitude", "candidate_coordinate_source_url", "independent_check_status", "approved_for_map_pin"}
    require(candidate_required.issubset(coord.columns), f"Coordinate queue missing fields: {sorted(candidate_required-set(coord.columns))}")
    require(set(coord["station_id"]).issubset(set(st["station_id"])), "Coordinate candidate references unknown station ID")
    require(coord["candidate_coordinate_source_url"].str.startswith("https://").all(), "Coordinate candidate missing source URL")
    lat = pd.to_numeric(coord["candidate_latitude"], errors="coerce")
    lon = pd.to_numeric(coord["candidate_longitude"], errors="coerce")
    require(lat.notna().all() and lat.between(-90, 90).all(), "Invalid candidate latitude")
    require(lon.notna().all() and lon.between(-180, 180).all(), "Invalid candidate longitude")
    require(coord["approved_for_map_pin"].str.lower().eq("no").all(), "Unverified coordinate candidate incorrectly approved for map use")
    require(coord["independent_check_status"].str.lower().str.contains("not_independently_checked|not independently checked|unverified", regex=True).all(), "Candidate independent-check status needs review")
    checks.append(f"Coordinate review queue: {len(coord)} candidate points from secondary sources; all remain unapproved for production map pins.")

    # Synthetic daily time series.
    daily_required = {"station_id", "date", "synthetic_sales_kg", "day_of_week", "is_weekend", "month", "year", "is_public_holiday", "event_name", "simulation_profile", "data_type", "generation_method"}
    require(daily_required.issubset(daily.columns), f"Daily dataset missing columns: {sorted(daily_required-set(daily.columns))}")
    dates_expected = pd.date_range(EXPECTED_START, EXPECTED_END, freq="D").strftime("%Y-%m-%d").tolist()
    require(len(dates_expected) == 731, "Internal date-range check failed")
    require(len(daily) == len(eligible) * 731, "Daily row count does not equal eligible station count x 731 days")
    require(set(daily["station_id"]) == set(eligible["station_id"]), "Daily station IDs do not exactly match locality-screened stations")
    require(not daily.duplicated(["station_id", "date"]).any(), "Duplicate station-date in daily data")
    require(daily.groupby("station_id")["date"].apply(lambda x: sorted(x.tolist()) == dates_expected).all(), "Daily date series incomplete for one or more stations")
    sales = pd.to_numeric(daily["synthetic_sales_kg"], errors="coerce")
    require(sales.notna().all() and np.isfinite(sales).all() and sales.ge(0).all(), "Daily sales contains invalid/negative values")
    require(daily["data_type"].eq("synthetic").all(), "Daily dataset includes records not labelled synthetic")
    require(daily["generation_method"].astype(str).str.strip().ne("").all(), "Daily generation method missing")
    parsed_dates = pd.to_datetime(daily["date"], format="%Y-%m-%d", errors="raise")
    require(daily["day_of_week"].eq(parsed_dates.dt.day_name()).all(), "Daily day_of_week inconsistent with date")
    expected_weekend = parsed_dates.dt.dayofweek.ge(5)
    actual_weekend = daily["is_weekend"].astype(str).str.lower().map({"true": True, "false": False})
    require(actual_weekend.notna().all() and actual_weekend.eq(expected_weekend).all(), "Daily is_weekend inconsistent with date")
    require(pd.to_numeric(daily["month"], errors="coerce").eq(parsed_dates.dt.month).all(), "Daily month inconsistent with date")
    require(pd.to_numeric(daily["year"], errors="coerce").eq(parsed_dates.dt.year).all(), "Daily year inconsistent with date")
    require(daily["date"].min() == EXPECTED_START and daily["date"].max() == EXPECTED_END, "Daily min/max dates incorrect")
    checks.append(f"Daily synthetic sales: {len(daily):,} rows, exact 2024-01-01 through 2025-12-31 coverage, no duplicate station-date keys or negative values.")

    # Supply time series must match daily sales keys exactly.
    supply_required = {"station_id", "date", "planned_available_supply_kg", "data_type", "generation_method"}
    require(supply_required.issubset(supply.columns), f"Supply dataset missing columns: {sorted(supply_required-set(supply.columns))}")
    require(len(supply) == len(daily), "Supply row count differs from daily sales")
    require(not supply.duplicated(["station_id", "date"]).any(), "Duplicate station-date in supply data")
    require(set(map(tuple, supply[["station_id", "date"]].astype(str).to_numpy())) == set(map(tuple, daily[["station_id", "date"]].astype(str).to_numpy())), "Supply keys differ from daily sales keys")
    q = pd.to_numeric(supply["planned_available_supply_kg"], errors="coerce")
    require(q.notna().all() and np.isfinite(q).all() and q.ge(0).all(), "Supply contains invalid/negative quantities")
    require(supply["data_type"].eq("synthetic").all(), "Supply dataset includes records not labelled synthetic")
    require(supply["generation_method"].astype(str).str.strip().ne("").all(), "Supply generation method missing")
    checks.append(f"Synthetic supply: {len(supply):,} rows; exact one-to-one station-date match with daily sales; nonnegative quantities.")

    # Hourly data must match corresponding daily totals and 30-day range.
    hourly_required = {"station_id", "datetime", "date", "hour", "hourly_cng_demand_kg", "day_of_week", "is_weekend", "simulation_profile", "data_type", "generation_method"}
    require(hourly_required.issubset(hourly.columns), f"Hourly dataset missing columns: {sorted(hourly_required-set(hourly.columns))}")
    require(hourly["station_id"].nunique() <= 3, "Hourly data includes more than three stations")
    require(set(hourly["station_id"]).issubset(set(eligible["station_id"])), "Hourly data references a station outside eligible inventory")
    require(not hourly.duplicated(["station_id", "datetime"]).any(), "Duplicate station-datetime in hourly data")
    hq = pd.to_numeric(hourly["hourly_cng_demand_kg"], errors="coerce")
    require(hq.notna().all() and np.isfinite(hq).all() and hq.ge(0).all(), "Hourly demand contains invalid/negative values")
    require(hourly["data_type"].eq("synthetic").all(), "Hourly data includes records not labelled synthetic")
    require(hourly["generation_method"].astype(str).str.strip().ne("").all(), "Hourly generation method missing")
    dt = pd.to_datetime(hourly["datetime"], format="%Y-%m-%d %H:%M:%S", errors="raise")
    require(hourly["date"].eq(dt.dt.strftime("%Y-%m-%d")).all(), "Hourly date disagrees with datetime")
    require(hourly["day_of_week"].eq(dt.dt.day_name()).all(), "Hourly day_of_week disagrees with datetime")
    expected_hourly_weekend = dt.dt.dayofweek.ge(5)
    actual_hourly_weekend = hourly["is_weekend"].astype(str).str.lower().map({"true": True, "false": False})
    require(actual_hourly_weekend.notna().all() and actual_hourly_weekend.eq(expected_hourly_weekend).all(), "Hourly is_weekend inconsistent with datetime")
    require(pd.to_numeric(hourly["hour"], errors="coerce").eq(dt.dt.hour).all(), "Hour column disagrees with datetime")
    require(hourly.groupby(["station_id", "date"]).size().eq(24).all(), "Some hourly station-days do not contain exactly 24 rows")
    require(hourly["date"].min() == EXPECTED_HOURLY_START and hourly["date"].max() == EXPECTED_HOURLY_END, "Hourly date range incorrect")
    hs = hourly.groupby(["station_id", "date"])["hourly_cng_demand_kg"].sum()
    ds_lookup = daily.set_index(["station_id", "date"])["synthetic_sales_kg"]
    diff = (hs - ds_lookup.loc[hs.index]).abs()
    max_diff = float(diff.max()) if len(diff) else float("inf")
    require(max_diff <= 0.011, f"Hourly totals differ from daily totals by {max_diff:.6f} kg")
    checks.append(f"Hourly synthetic demand: {len(hourly):,} rows; up to three stations; 24 rows per station-day; daily reconciliation max difference {max_diff:.5f} kg.")

    # Optional historical context values are source-attributed and never used to create stations.
    require(infra["data_type"].eq("real_public").all(), "Infrastructure indicators must be sourced public figures")
    require(infra["source_url"].astype(str).str.startswith("https://").all(), "Infrastructure indicator missing source URL")
    require(infra["record_id"].is_unique, "Duplicate infrastructure record ID")
    checks.append(f"Optional infrastructure context: {len(infra)} sourced indicators; geographic scope and periods preserved in notes.")

    # Provenance inventory and data gaps.
    require(src["source_id"].is_unique, "Duplicate source IDs")
    require(src["source_name"].str.strip().ne("").all(), "Source inventory has missing source names")
    require(gaps["dataset_or_information_needed"].str.strip().ne("").all(), "Data gaps contain an unnamed gap")
    require(len(gaps) > 0, "Data gap inventory must record unresolved high-impact gaps")
    require(src["source_url"].eq("").sum() == 1 and src.loc[src["source_url"].eq(""), "data_origin"].str.contains("synthetic", case=False).all(), "Only the internal synthetic-generation method may have a blank URL")
    checks.append(f"Provenance: {len(src)} source/method records; {len(gaps)} documented data gaps; no blank source URL except the internal simulation method.")

    # Dictionary covers every CSV and has no duplicate dictionary entries.
    require({"file_name", "column_name", "data_type", "unit", "description", "example_value", "allowed_values_or_constraints", "required_or_optional", "data_origin"}.issubset(dictionary.columns), "Dictionary schema incomplete")
    require(not dictionary.duplicated(["file_name", "column_name"]).any(), "Duplicate data dictionary file/column entry")
    csv_paths = sorted(p for p in BASE.rglob("*.csv") if p.is_file())
    missing_schema = []
    stale_schema = []
    for csv_path in csv_paths:
        relative = csv_path.relative_to(BASE).as_posix()
        frame = pd.read_csv(csv_path, nrows=3, encoding="utf-8")
        documented = set(dictionary.loc[dictionary["file_name"].eq(relative), "column_name"])
        absent = set(frame.columns) - documented
        extra = documented - set(frame.columns)
        if absent:
            missing_schema.append(f"{relative}: undocumented={sorted(absent)}")
        if extra:
            stale_schema.append(f"{relative}: nonexistent={sorted(extra)}")
    require(not missing_schema, "Data dictionary missing schema columns: " + "; ".join(missing_schema))
    require(not stale_schema, "Data dictionary has stale schema rows: " + "; ".join(stale_schema))
    checks.append(f"Data dictionary: covers all {len(csv_paths)} CSV files and every column, including its own schema; no stale entries.")

    # Reproducible baseline evaluation: last 90 days tested chronologically, previous 28 calendar days as baseline.
    metric_rows: list[tuple[float, float]] = []
    test_start = pd.Timestamp("2025-10-03")
    daily_eval = daily.copy()
    daily_eval["parsed_date"] = pd.to_datetime(daily_eval["date"], format="%Y-%m-%d")
    for _, group in daily_eval.sort_values("parsed_date").groupby("station_id"):
        group = group.sort_values("parsed_date")
        values = group.set_index("parsed_date")["synthetic_sales_kg"]
        for target_date in values.index[values.index >= test_start]:
            history = values.loc[values.index < target_date].tail(28)
            if len(history) == 28:
                actual = float(values.loc[target_date])
                prediction = float(history.mean())
                metric_rows.append((actual, prediction))
    require(len(metric_rows) > 0, "Baseline evaluation yielded no test rows")
    actuals = np.array([x[0] for x in metric_rows], dtype=float)
    predictions = np.array([x[1] for x in metric_rows], dtype=float)
    mae = float(np.mean(np.abs(actuals-predictions)))
    rmse = float(np.sqrt(np.mean((actuals-predictions)**2)))
    smape = float(np.mean(2*np.abs(actuals-predictions)/(np.abs(actuals)+np.abs(predictions)+1e-12))*100)
    checks.append(f"Synthetic-only baseline: chronological 28-day rolling mean; test period 2025-10-03 through 2025-12-31; n={len(metric_rows)} station-days; MAE={mae:.2f} kg/day, RMSE={rmse:.2f} kg/day, sMAPE={smape:.2f}%.")

    # Derive counts for report.
    shortage_days = int((daily[["station_id", "date", "synthetic_sales_kg"]].merge(
        supply, on=["station_id", "date"], validate="one_to_one")["synthetic_sales_kg"] >
        daily[["station_id", "date"]].merge(supply, on=["station_id", "date"], validate="one_to_one")["planned_available_supply_kg"]).sum())
    operator_counts = st["operator"].replace("", "not established").value_counts().to_dict()
    csv_count_table = []
    for p in csv_paths:
        frame = pd.read_csv(p, encoding="utf-8")
        csv_count_table.append((p.relative_to(BASE).as_posix(), len(frame), len(frame.columns)))

    # Limitations are important findings, not failed technical integrity tests.
    limitations.append("No station in cng_stations.csv has independently verified latitude/longitude; the primary master intentionally leaves both fields blank.")
    limitations.append("All eight points in station_coordinate_candidates.csv are secondary-source leads and are explicitly barred from production map pins until independently checked.")
    limitations.append("The 12-row station master is a source-backed subset, not a complete census of Ahmedabad CNG stations. Eleven rows are locality-screened in-scope; one fringe row is uncertain and excluded from simulation.")
    limitations.append("All historical sales, planned supply and hourly demand values are synthetic. The baseline metrics above measure only simulation behavior, not actual Ahmedabad operating accuracy.")
    limitations.append("No reusable Ahmedabad-specific Vahan registration export, actual station-day sales/supply data, verified full station network, or dated/processed AMC boundary was obtained for this package.")
    limitations.append("PPAC context indicators use historical or broader authorized-area/national scopes and must not be interpreted as a current AMC-only station count.")
    if not (BASE / "optional" / "vehicle_registrations.csv").exists():
        limitations.append("optional/vehicle_registrations.csv was intentionally not created because no suitable Ahmedabad-specific export was retrieved; no empty placeholder file is included.")
    if not (BASE / "optional" / "official_holidays.csv").exists():
        limitations.append("optional/official_holidays.csv was intentionally not created because a complete, sourced 2024-2025 Gujarat holiday table was not retrieved; holiday and event fields remain unassigned in the simulation.")

    # Render report with actual checks and CSV counts.
    today = date.today().isoformat()
    lines = [
        "# CNG SmartPlan — Validation Report",
        "",
        f"**Validation run date:** {today}  ",
        "**Package:** Ahmedabad, Gujarat, India — PS000002  ",
        "**Validator:** `validate_package.py`  ",
        "**Synthetic generator:** `generate_synthetic_data.py` (fixed seed 20241029)",
        "",
        "> **Interpretation:** Passing these tests confirms technical consistency of the included files. It does not mean the real station inventory is complete, coordinates are verified, or synthetic values represent actual station operations.",
        "",
        "## 1. Validation result",
        "",
        f"**PASS — {len(checks)} automated check groups. No technical integrity checks failed.**",
        "",
    ]
    lines.extend(f"- PASS: {c}" for c in checks)
    lines += ["", "## 2. CSV row and column counts", "", "| File | Rows | Columns |", "|---|---:|---:|"]
    lines.extend(f"| `{md_escape(name)}` | {rows:,} | {cols} |" for name, rows, cols in csv_count_table)
    lines += [
        "",
        "## 3. Key record counts",
        "",
        f"- Station master: **{len(st)}** rows.",
        f"- Locality-screened records included in synthetic time series: **{len(eligible)}**.",
        f"- Coordinate candidates: **{len(coord)}**, with **0 approved** for production map use.",
        f"- Daily synthetic sales: **{len(daily):,}** rows.",
        f"- Synthetic planned supply: **{len(supply):,}** rows.",
        f"- Synthetic hourly demand: **{len(hourly):,}** rows across **{hourly['station_id'].nunique()}** stations.",
        f"- Contextual infrastructure indicators: **{len(infra)}** rows.",
        f"- Station-days where simulated supply is below simulated sales: **{shortage_days:,}** (scenario output only).",
        "",
        "### Station operator-field counts",
        "",
        "| Operator field | Records |",
        "|---|---:|",
    ]
    lines.extend(f"| {md_escape(operator)} | {int(count)} |" for operator, count in operator_counts.items())
    lines += [
        "",
        "## 4. Synthetic forecasting-readiness check",
        "",
        "A simple baseline was evaluated without random shuffling: each test-day prediction is the mean of the prior 28 days for the same station. The chronological test period is 2025-10-03 through 2025-12-31.",
        "",
        "| Metric | Result |",
        "|---|---:|",
        f"| Test observations | {len(metric_rows):,} station-days |",
        f"| MAE | {mae:.2f} kg/day |",
        f"| RMSE | {rmse:.2f} kg/day |",
        f"| sMAPE | {smape:.2f}% |",
        "",
        "These are **synthetic-demo evaluation metrics only**. They do not establish model performance on real CNG sales. A seven-day forecast can be generated technically, but its operational usefulness cannot be inferred from simulated inputs.",
        "",
        "## 5. Remaining data-readiness limitations",
        "",
    ]
    lines.extend(f"- {item}" for item in limitations)
    lines += [
        "",
        "## 6. Practical readiness decision",
        "",
        "- **Ready:** synthetic forecasting experiments, supply-alert UI logic, hourly profile visualization, CSV ingestion and prototype demonstrations.",
        "- **Not ready:** production station map pins, distance-based nearest-station analysis, geospatial candidate rankings, evidence-backed new-station impact prediction, or claims about real-world forecast accuracy.",
        "- **Required next inputs:** verified station coordinates and a dated Ahmedabad urban boundary; a more complete cross-operator station inventory; and, for operational validation, authorized historical station-level sales and supply data.",
        "",
        "## 7. Technical note",
        "",
        "The generator never modifies `cng_stations.csv`. It uses only rows with `in_study_area=yes`, leaves holiday/event values unassigned unless a properly sourced `optional/official_holidays.csv` is added, and labels generated observations `data_type=synthetic`.",
        "",
    ]
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(f"PASS: {c}" for c in checks))
    print(f"\nCSV COUNTS: {len(csv_count_table)} files")
    for name, rows, cols in csv_count_table:
        print(f"- {name}: {rows:,} rows x {cols} columns")
    print(f"Baseline metrics (synthetic only): MAE={mae:.2f}; RMSE={rmse:.2f}; sMAPE={smape:.2f}%; n={len(metric_rows)}")
    print(f"Wrote report: {REPORT}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"VALIDATION FAILED: {exc}", file=sys.stderr)
        raise
