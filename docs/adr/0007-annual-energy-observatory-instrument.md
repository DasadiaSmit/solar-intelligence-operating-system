# ADR 0007: Annual Energy Observatory instrument

## Status

Accepted.

## Date and accountable departments

2026-07-29. Accountable: TWIN and EXPERIENCE. Review boundaries: ARCH,
FEATURES, SOLAR, FORECAST, DATA, QA, ACCESSIBILITY and SECOPS.

## Context and constraints

ADR 0006 mounted Atmospheric Observation at Observatory position 02 while
preserving Instrument 01, one canvas, one frame owner and the unchanged
analytical application. Milestone 4 Increment 03 may add only Annual Energy
Observatory at position 03. Instruments 01 and 02 must remain formed at subdued
emphasis, positions 04–07 must remain placeholders, positions 08–14 must remain
reserved, and the Moon remains outside scope until Milestone 5.

The full canonical `OperatingSnapshot` contains 8,760 unrounded hourly
modelled-AC values and their quality scores. The long-lived
`sios-hour-tuple-v1` is rounded for browser display and is not an appropriate
source for an exact annual scientific handoff. Chronology and month can be
reconstructed without serializing redundant per-hour index, timestamp or month
columns because the annual contract fixes a UTC start time, a 3,600-second
interval and a no-leap record count.

The available four source-year annual totals support an empirical interannual
spread. Four observations do not establish a calibrated probabilistic
prediction interval, an issued forecast, a production guarantee or measured
plant accuracy.

## Decision

1. Add renderer-neutral `AnnualEnergyFrameV1` at schema version `1.0.0`. Build
   it server-side from the full canonical `OperatingSnapshot`, before compact
   browser projection, under the same reproducible result identity used by the
   application.
2. Preserve exactly 8,760 unrounded canonical hourly modelled-AC values and
   quality scores. The calendar must be one contiguous non-leap UTC year with a
   3,600-second interval. Invalid record count, start/end geometry, chronology,
   interval, values, lifecycle, result identity or provenance fails closed.
3. Serialize only `generationAcKWh` and `qualityScores` as hourly series
   columns. Reconstruct canonical hour index and UTC month from
   `startTimestampUtc + index * intervalSeconds`. Preserve annual summaries,
   twelve monthly totals and four hemisphere-aware meteorological-season
   totals, and require hourly, monthly, seasonal and annual energy to reconcile
   without display rounding.
4. Carry the configured DC capacity, peak one-hour AC value, annual generation,
   specific yield, mean quality, lifecycle, units, provider, dataset version,
   calculation version, evidence references and representative-year identity.
5. Describe P10, P50 and P90 only as an empirical annual spread over the four
   source-year annual totals (`n = 4`), using the stated
   linear-interpolation-between-ordered-values method. Set
   `calibratedProbabilisticInterval` and `forecastGuarantee` to false; never
   describe the result as an issued future forecast.
6. Carry five explicit unavailable layers: measured or live plant output,
   issued future forecast, intra-hour variation, spatial generation field and
   causal climate attribution. The renderer and HTML presentation may not
   synthesize any of them.
7. Mount `I03` at position 03 with the key `annual-energy-observatory`. The
   immutable registry therefore contains three mounted instruments, four
   navigable placeholders and seven reserved positions. Instruments 01 and 02
   remain formed and visible at reduced emphasis when Instrument 03 becomes
   active.
8. Render all 8,760 samples through one `InstancedBufferGeometry` draw path.
   Canonical hour controls angle; the display-only ratio of hourly AC energy to
   the annual peak controls radial displacement; northern/southern
   meteorological season controls muted colour; quality may only reduce
   luminance. Adaptive tiers may change glyph geometry and point size but may
   never drop or aggregate samples.
9. Keep `ObservatorySceneManager` as the sole `useFrame` owner in the existing
   demand-rendered canvas. Instrument 03 owns no frame loop, invalidation path,
   timer, random source, texture or second canvas. Its external imperative
   presentation handle changes only the orbit-to-production shader uniform;
   reduced motion remains an upstream policy.
10. Keep exact annual facts, empirical-spread language, lifecycle, quality,
    provenance, unsupported layers and action in semantic HTML. The mounted
    instrument issues a typed `AF` activation request into the existing Annual
    Forecast workspace. WebGL remains optional, pointer-inert and
    non-authoritative.

## Alternatives considered

- Reusing the rounded 14-value annual browser tuple was rejected because it
  would make display precision the source of an exact scientific instrument.
- Sending 8,760 indices, timestamps and month numbers was rejected because the
  versioned calendar reconstructs all three deterministically.
- Downsampling, envelope rendering or dropping night-time values was rejected
  because the instrument contract requires one visible instance for every
  canonical hour.
- Rendering axes, labels, reports or charts in WebGL was rejected because exact
  explanation and interaction remain accessible HTML responsibilities.
- Presenting four annual values as a calibrated prediction interval was
  rejected because `n = 4` supports only a limited empirical interannual
  spread.
- Adding an instrument-local animation loop or a second canvas was rejected
  because formation belongs to the established sole frame coordinator and
  demand-idle renderer.
- Removing Instruments 01 or 02 was rejected because the Observatory is one
  persistent scientific environment whose earlier instruments remain spatial
  context.

## Consequences and risks

The server-to-client annual frame adds two full-length numeric series plus
bounded summaries and provenance. Omitting redundant chronology and month
columns limits that cost without altering the compact analytical-shell tuple.

One instanced draw path keeps draw-call count constant while retaining all
8,760 samples. Shader and fill-rate cost still depend on device capability, so
quality tiers reduce glyph complexity and size without changing sample count.
The measured asset sizes remain complexity budgets, not evidence of
reference-device FPS, memory usage or idle-GPU behavior.

Season colour is a categorical calendar encoding, not a temperature, climate
trend or causal attribution. Radial position is normalized within this annual
display and does not change or replace the exact energy values in HTML.

The empirical P10/P50/P90 values remain sensitive to the short four-year
record. Every presentation must retain the `n = 4`, non-calibrated,
non-guaranteed and non-issued-forecast disclosures.

## Verification

The Increment 03 release gates cover:

- three mounted, four placeholder and seven reserved registry entries;
- exactly 8,760 unrounded canonical hourly AC and quality values;
- a contiguous 3,600-second no-leap UTC calendar and fail-closed malformed
  calendar/value/provenance behavior;
- exact hourly-to-monthly-to-seasonal-to-annual reconciliation for both
  hemispheres;
- explicit empirical `n = 4` P10/P50/P90 semantics and all five unsupported
  layers;
- one `InstancedBufferGeometry` draw path, exact instance count at every quality
  tier, no sample dropping and no chart or text in WebGL;
- persistence at reduced emphasis of Instruments 01 and 02;
- one canvas, one `useFrame` owner, external formation uniform and no
  instrument-local time, randomness or invalidation;
- semantic HTML parity and typed `AF` handoff;
- strict TypeScript, lint and production build passing;
- 45/45 visual tests and 5/5 smoke tests passing;
- measured `SolarOperatingSystem` asset of 154,249 bytes raw / 41,331 bytes
  gzip, continuous scene asset of 344,888 / 139,219, incremental spatial
  closure of 1,244,231 / 377,105 beneath 1,265,000 raw, and complete closure of
  1,434,732 / 436,445 beneath 1,465,000 raw.

## Successor boundary

The next Milestone 4 increment may integrate Instrument 04 only after its own
scientific, accessibility, performance and workspace-handoff contracts are
accepted. Instruments 01–03, their versioned evidence boundaries, the existing
analytical workspaces, sole frame owner and typed handoffs must remain backward
compatible. The Moon and lunar state remain prohibited until Milestone 5.
