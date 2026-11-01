# Proposal: Candidate Location Ranking & Suitability Evaluation Framework

**Author**: Member 2 (Backend & Data Developer)  
**Date**: 2026-10-31  
**Status**: DRAFT PROPOSAL FOR REVIEW (Not active code)  
**Task Reference**: Prompt 4 Task E / Milestone 4

---

## 1. Executive Summary & Problem Context

In CNG network planning, evaluating proposed station candidate locations is a critical decision-support feature. However, naive spatial ranking based solely on Euclidean/geodesic distance to existing stations or ungrounded synthetic demand proxies is severely misleading and commercially hazardous.

A location that is "far from existing stations" might be in an unzoned greenfield, have zero gas pipeline connectivity, or sit on a low-traffic residential access road where commercial heavy vehicles cannot turn. Conversely, a station near an existing outlet might be desperately needed if the existing station suffers 45-minute queues during peak diurnal commute windows along a major national highway corridor.

Therefore, **no ranking feature based purely on distance or fabricated demand will be implemented in the active prototype**. This document outlines the rigorous multi-criteria decision framework required before any candidate ranking service is deployed.

---

## 2. Prohibition of Misleading Distance-Only Ranking

The backend strictly rejects:
1. **Distance-to-Nearest-Station Maximization**: Suggesting that any location far from stations is automatically a "Grade A" candidate.
2. **Fabricated Catchment Demand**: Assigning arbitrary synthetic numbers to candidate locations without empirical local traffic or demographic indicators.
3. **Black-box Heuristics**: Scoring candidate locations without transparent, observable weights and uncertainty bounds.

---

## 3. Proposed Observable Indicators & Criteria

If a candidate ranking feature is approved in a future scope, it must evaluate candidates against observable, verifiable real-world indicators:

| Category | Indicator | Measurement Unit | Data Source (Required) | Weight (Proposed) |
|---|---|---|---|---|
| **Pipeline Connectivity** | Distance to CGD steel pipeline network | Meters ($\le 500\text{m}$ ideal) | CGD Operator (Adani Total Gas / Gujarat Gas) | 25% |
| **Traffic Exposure** | Average Annual Daily Traffic (AADT) on adjacent roadway | Commercial PCU / day | AMC / NHAI Traffic Counts | 20% |
| **Road Hierarchy** | Arterial / Sub-arterial classification | Road classification tier | AMC Master Plan / GDCR | 15% |
| **Vehicle Fleet Density** | Registered CNG 3W & 4W in surrounding RTO zone | Vehicles per $\text{km}^2$ | Vahan RTO Dashboard | 15% |
| **Network Congestion Relief**| Neighboring station queue/peak shortfall severity | kg/day shortfall frequency | Station Operating Data | 15% |
| **Plot Geometry & Setbacks**| Minimum frontage ($\ge 35\text{m}$) and turning radius | Meters / PESO compliance | Cadastral Survey / PESO Rules | 10% |

---

## 4. Missing Data & Uncertainty Handling

1. **Missing Indicator Penalty**: If any primary indicator is unavailable (e.g. no pipeline proximity data), the candidate score cannot default to average or zero. It must be explicitly tagged as `SCORE_INDETERMINATE: MISSING_CRITICAL_INPUTS`.
2. **Explicit Uncertainty Band**: Any resulting composite score must include a confidence interval or qualitative rating tier (`High Data Quality`, `Moderate Data Quality`, `Provisional`).
3. **No Automatic Site Selection**: Scores must be presented as decision-support indicators with detailed itemized rationale, never an automated site-investment recommendation.

---

## 5. Architectural Separation of Candidate Points

User-selected or scenario candidate coordinates must remain strictly separated from production station records:
- **Station Master** (`cng_stations.csv`): Contains only verified, source-backed network stations.
- **Scenario Location** (passed via `POST /api/v1/impact-simulator`): Ephemeral simulation input, never saved into or joined with the station directory.
- **Candidate Research Queue** (`station_coordinate_candidates.csv`): Quarantine list of historical secondary web listings pending field verification.

