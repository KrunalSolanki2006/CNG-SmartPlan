# Curated Data Research & Verification Registry

This directory contains research outputs, verification audits, and curated station provenance enrichments maintained by Member 2 (Backend & Data).

## Important Data Governance Rules
1. **Source Package Immutability**: Files in `CNG_SmartPlan_Data/` are immutable original source files and must **never** be overwritten.
2. **Conservative Pin Promotion**: No candidate coordinates from secondary scraping directories are promoted to approved map pins without primary operator corroboration and geospatial boundary confirmation.
3. **Approved Station Pin Count**: Currently **0** out of 12 stations are approved for map pin display.
4. **Boundary Validation**: The dated Ahmedabad Municipal Corporation (AMC) administrative ward boundary polygon (e.g. DataMeet `Wards.geojson`, CC-BY 4.0) has not been integrated into the current package. Study area inclusion remains strictly provisional locality screening (`in_study_area = yes`). Point-in-polygon verification is not claimed.

---

## File Inventory

### 1. `station_verification_registry.csv`
Comprehensive multi-dimensional verification audit for all 12 stations in `cng_stations.csv`.

| Field | Description |
|---|---|
| `station_id` | Primary key (`AMD001`–`AMD012`) |
| `station_name` | Station trade name |
| `primary_source_id` | `SRC001` (Gujarat Energy) or `SRC002` (HPCL) |
| `primary_source_publisher` | Publisher of primary operating directory |
| `primary_cng_listing` | Whether primary directory lists outlet as CNG |
| `candidate_latitude` | Candidate latitude from secondary directory (or blank) |
| `candidate_longitude` | Candidate longitude from secondary directory (or blank) |
| `candidate_source_id` | `SRC011`–`SRC018` from `data_sources.csv` |
| `candidate_source_publisher` | Publisher (`CNGbunk.com`) |
| `candidate_source_url` | Direct URL to candidate detail page |
| `identity_verified` | `True` (station identity confirmed in official directory) |
| `cng_dispensing_confirmed` | Official directory status |
| `operator_conflict_flag` | `True` for AMD001 & AMD002 (Adani CNG vs Gujarat Energy) |
| `dispenser_unconfirmed_flag` | `True` for AMD003, AMD005, AMD006, AMD007, AMD009, AMD011 |
| `point_coordinate_quality` | `unverified_secondary_candidate` (8) or `missing_no_candidate` (4) |
| `study_boundary_eligibility` | `provisional_locality_screen` (11) or `uncertain_periphery` (1) |
| `approved_for_map_pin` | `False` for ALL 12 stations |
| `quarantine_reason` | Specific evidence rationale for keeping coordinate quarantined |
| `licence_or_attribution` | Source licensing and attribution requirement |
| `last_reviewed_date` | Date of audit (`2026-10-31`) |

### 2. `CANDIDATE_RANKING_PROPOSAL.md`
Formal technical proposal outlining why naive distance-based candidate ranking is prohibited, and defining the observable indicators, weights, and missing-data treatments required before implementing any network ranking algorithms.

