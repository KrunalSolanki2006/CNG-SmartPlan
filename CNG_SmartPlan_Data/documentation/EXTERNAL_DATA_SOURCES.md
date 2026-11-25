# FUELCAST — External Data Sources Register

**Retrieval Date:** 2026-11-25  
**Registry File:** `CNG_SmartPlan_Data/external/external_datasets_registry.csv`

## 1. Historical Daily Weather (`external/gujarat_district_weather_daily.csv`)
- **Source:** Open-Meteo Historical Weather API (ERA5 / IFS reanalysis)
- **URL:** `https://archive-api.open-meteo.com/v1/archive`
- **Retrieval Date:** 2026-11-25
- **Geographic Coverage:** 12 Gujarat district centroids (`Ahmedabad`, `Anand`, `Bharuch`, `Bhavnagar`, `Jamnagar`, `Kutch`, `Mehsana`, `Navsari`, `Rajkot`, `Surat`, `Vadodara`, `Valsad`)
- **Date Coverage:** `2024-01-01` through `2026-11-24` (`1,059` days × `12` districts = `12,708` rows)
- **Variables & Units:** `temp_max_c` (°C), `temp_min_c` (°C), `temp_mean_c` (°C), `precipitation_mm` (mm), `wind_speed_max_kmh` (km/h)
- **Missing Values:** `0` missing values across all `12,708` rows
- **Limitations:** District-centroid reanalysis grid rather than station-level microclimate weather gauges.

## 2. Gujarat Public Holidays & Festivals (`external/gujarat_holidays_festivals_2024_2026.csv`)
- **Source:** General Administration Department (GAD), Government of Gujarat notifications (including Notification No. `GS/22/2025/JSR/2025/509/GH` for 2026)
- **URL:** `https://gad.gujarat.gov.in/`
- **Retrieval Date:** 2026-11-25
- **Geographic Coverage:** Gujarat / India
- **Date Coverage:** `2024-01-01` through `2026-11-24` (`65` holiday/festival dates)
- **Missing Values:** `0`
- **Limitations:** Captures major state public holidays and Gujarat festivals (Uttarayan, Holi/Dhuleti, Eid, Janmashtami, Navratri, Dussehra, Diwali, Bestu Varas, Bhai Bij, etc.); unscheduled local closures are not included.

## 3. Macro CNG & Vehicle Context (`external/gujarat_cng_macro_context.csv`)
- **Sources:** VAHAN Parivahan Public Dashboard (`https://www.analytics.parivahan.gov.in/analytics/publicdashboard/vahan?lang=en`), PPAC (`https://ppac.gov.in/`)
- **Retrieval Date:** 2026-11-25
- **Coverage & Units:** Gujarat state-level CNG car share (`38%`), annual total vehicle registrations (`~2.15M/year`), operational CNG stations floor (`>1,000` stations)
- **Limitations:** State-level macro context only; district-by-month VAHAN CNG registration tables require manual interactive portal exports and are not fabricated.
