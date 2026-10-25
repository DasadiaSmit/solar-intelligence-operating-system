# Data providers and ingestion

## Operational contract

All network providers terminate at `lib/providers`. Provider-specific field names, timestamps and units are converted into `CanonicalWeatherHour` before any scientific calculation sees them. The canonical grid is hourly UTC and uses degrees Celsius, metres per second, hPa, millimetres/centimetres and W m⁻².

Each dataset reports:

- provider, product and adapter version;
- requested and actual data class;
- retrieval time and, when the upstream product supplies it, forecast issue time;
- valid range, interval and units;
- completeness, quality score, flags and imputation state;
- transformations, assumptions, warnings and uncertainty availability;
- calculation/schema versions, content hash and reproducible snapshot ID;
- every attempted provider and whether a semantic substitution occurred.

An estimate is never a production guarantee. A gridded product does not resolve a site survey, local horizon, plant outage or measured meter state.

## Implemented providers

### Deterministic sample provider

Status: **simulated**.

The sample provider generates a deterministic UTC series from bounded seasonal, diurnal and synoptic functions. Its timestamp is the end of the preceding hour and synthetic conditions are evaluated at the interval midpoint, matching the research adapter's radiation convention. It has no network or credential dependency and is intended for UI operation, automated tests, education and pipeline verification. It is not calibrated to a measured site, observation, reanalysis or issued forecast. Every record carries `synthetic:deterministic_sample`, and every response calls the data class `simulation`.

The same query and provider/calculation versions produce the same canonical content hash. Retrieval time may differ, while the content-addressed dataset ID remains reproducible.

### Open-Meteo

Status: **implemented adapter; upstream availability is external**.

The server adapter uses:

- the Open-Meteo Weather Forecast API for `issued_forecast` requests;
- the Open-Meteo Historical Weather API for `reanalysis` requests;
- `best_match` for forecast model selection by default;
- ERA5 for a consistent reanalysis selection by default.

It requests temperature, relative humidity, cloud cover, precipitation, snow depth, surface pressure, 10 m wind, GHI, DNI and DHI. The request fixes GMT/UTC and canonical unit options, then independently checks and converts the returned units. Radiation values are preceding-hour means. See the [official Weather Forecast API](https://open-meteo.com/en/docs) and [official Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api).

Important limits:

- historical results are gridded model/reanalysis estimates, not direct station observations;
- the best-match response does not expose one authoritative issue time, so `issueTimeUtc` is `null` rather than inferred;
- forecast requests are bounded to 16 days and exact query ranges to 366 days; one date-granular boundary day may produce up to 8,808 transport values before exact interval filtering;
- default ERA5 availability has an upstream publication delay;
- the adapter does not yet expose ensemble members or calibrated predictive intervals.

### PVGIS/JRC

Status: **implemented adapter; upstream availability is external**.

The PVGIS 5.3 server adapter calls the JRC typical-meteorological-year tool with horizon modelling and JSON output. It maps T2m, relative humidity, GHI, DNI, DHI, 10 m wind and surface pressure. Source-month timestamps remain in `sourceTimestamp`, while the canonical annual axis is normalised to the non-leap year 2001 UTC.

PVGIS requires a source period of at least ten years for TMY construction. This adapter therefore does not misrepresent 2022–2025 as a PVGIS TMY and does not call the product a forecast or measured year. Cloud cover, precipitation and snow depth are not supplied by this product and remain null. See the European Commission JRC [PVGIS non-interactive API documentation](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en) and [TMY tool description](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/pvgis-5-tools/pvgis-typical-meteorological-year-tmy-generator_en).

## Data classes and safe fallback

| Requested class | Primary adapter | Automatic live fallback | Sample substitution |
| --- | --- | --- | --- |
| `simulation` | deterministic sample | not applicable | native class |
| `issued_forecast` | Open-Meteo forecast | none in v1 | auto mode only, explicit flag |
| `reanalysis` | Open-Meteo historical/ERA5 | none in v1 | auto mode only, explicit flag |
| `typical_meteorological_year` | PVGIS/JRC | none in v1 | auto mode only, explicit flag |
| `observation` | not implemented | none | never presented as observation |

Fallback is fail-closed in `live` mode. In `auto` mode a failed public provider may return deterministic sample data only if both server policy and request policy allow it. That response changes `actualDataClass` to `simulation`, sets `semanticSubstitution: true`, and emits a leading warning. Simulated values never impersonate observations, reanalysis or a forecast.

## Validation and quality

1. Validate response shape and aligned array lengths.
2. Parse and sort ISO timestamps; discard invalid/duplicate timestamps.
3. Convert provider units to canonical units.
4. Reject non-finite values and values outside broad physical bounds.
5. Flag irradiance component inconsistencies.
6. Linearly interpolate only eligible state fields—temperature, humidity, cloud, pressure, wind and GHI—across interior gaps of one or two hours with valid adjacent hours. Precipitation, snow, DNI and DHI are not linearly bridged.
7. Preserve longer gaps as `null`.
8. Score per-hour completeness, imputation and outlier flags; aggregate a dataset score and level.

The physical bounds are safety guards, not climatological validation. A value inside a broad bound may still be wrong. Provider comparison and measured-site residual checks remain required for production research.

## Retry, rate limits and cache

- Upstream requests use a configurable timeout (default 7 s), at most three attempts and capped exponential backoff.
- HTTP 429, PVGIS 529 and 5xx responses are retryable; `Retry-After` is honoured only within a 2 s Worker request bound.
- Provider errors retain stable error codes and retry metadata.
- A small bounded in-process cache removes duplicate requests within a warm Worker instance.
- API responses also provide explicit HTTP cache policy by data class.

The in-process cache is opportunistic, not durable or globally coherent. Production traffic protection must also use edge rate limiting, quotas and provider-specific capacity agreements.

## Configuration

`.env.example` is the non-secret configuration contract. No provider key is hard-coded. Important controls are:

- `SOLAR_PROVIDER_MODE=auto|live|sample`;
- `SOLAR_ALLOW_SIMULATED_FALLBACK=true|false`;
- Open-Meteo/PVGIS HTTPS endpoints and model selectors;
- bounded timeout, attempts, backoff and cache TTL;
- scheduled-ingestion provider and default coordinates.

Endpoint overrides are accepted only from environment configuration, never request parameters. HTTPS is required except for localhost test doubles.

## Scheduled ingestion

`runScheduledIngestion(env, scheduledTime)` is the bounded Worker entry point. It does nothing—without making a network call—when D1 is unavailable. With D1 it refreshes exactly one configured provider/range, validates the canonical dataset, writes content-addressed raw/canonical JSON to R2 when available, and records provider run, dataset manifest and job checkpoint metadata.

Scheduled ingestion defaults to the deterministic sample provider. Enabling live ingestion requires an operational review of provider terms, capacity, attribution, retention, failure alerts and data protection.

## Annual research acquisition

`GET /api/v1/studies/annual` connects the provider layer to the annual scientific engine. It requests 2022, 2023, 2024 and 2025 separately, preserves 8,784 source hours for leap-year evidence, removes 29 February only at the declared no-leap science boundary, and refuses incomplete or semantically substituted years.

- `mode=sample` verifies the complete pipeline without credentials.
- `mode=live` pins the configured Open-Meteo reanalysis product (ERA5 by default) and disables sample fallback.
- Radiation timestamps identify the interval end; geometry is evaluated 30 minutes earlier at the preceding-hour midpoint.
- Required unresolved gaps fail the study.
- Missing snow depth uses a flagged balance proxy rather than silent zero filling.
- Evidence exposes provider quality separately from adapter-adjusted science quality and counts Erbs decomposition, supplied-component closure correction, snow-proxy and snow-albedo derivations.
- Dataset snapshot IDs, canonical content hashes, adapted-science hashes, adapter version and model recipes are parents of the final study ID; adapted hashes are verified before simulation.

The route returns compact annual evidence rather than 35,000+ raw records. It never relabels reanalysis as observation or issued forecast, and it does not claim validation against measured production.

## Planned provider work

- Copernicus Climate Data Store/ERA5 acquisition jobs with licence-aware immutable GRIB/NetCDF snapshots.
- Native ECMWF forecast/reforecast adapters with exact run/issue time and ensemble members.
- EUMETSAT satellite-derived cloud/radiation products.
- Measured inverter/meter telemetry and station-observation adapters.
- A second live provider for class-preserving automatic failover.

These remain planned beyond the implemented configurable Open-Meteo annual-reanalysis path. No result or metric claims that the remaining providers or measured-production sources are connected.
