# ADR 0009: Scenario comparison Observatory instrument

## Status

Accepted. Increment 05 release gates passed on 2026-07-29.

## Date and accountable departments

2026-07-29. Accountable: ENERGY, SOLAR, TWIN and EXPERIENCE. Review
boundaries: ARCH, DATA, FORECAST, FEATURES, QA, ACCESSIBILITY and SECOPS.

## Context and constraints

ADR 0008 mounted Solar Array Engineering at position 04 and preserved one
canvas, one scene-frame owner, the earlier instruments, the existing
analytical application and all scientific calculation paths. Instrument 05
must add simultaneous scenario comparison without replacing Instruments
01–04, weakening their evidence contracts or presenting generated effects as
observations.

The source brief gives sunny, cloudy, dust, extreme-heat and storm conditions
as examples. The current canonical `OperatingSnapshot` does not contain five
parallel weather worlds:

- it contains one configured representative weather chronology;
- the optimisation record contains four named, deterministic stress results:
  extended summer heatwave, Atlantic storm week, persistent snow cover and a
  seven-day inverter outage;
- each stress result carries annual generation, screened energy-value and
  local-supply deltas plus its exact deterministic assumption;
- sunny, cloudy, heatwave and storm are available as whole-snapshot proving
  weather configuration modes, but their parallel annual results are not
  serialized in the active result;
- dust is a configured static loss input, not a validated accumulation,
  deposition, cleaning or resuspension event model; and
- the stress record contains no scenario probability, hourly stress
  trajectory, measured response, issued forecast, storm-damage model or
  structural wind-load result.

Scientific integrity therefore requires comparison chambers for the
configured baseline and the four existing canonical stress results. It does
not permit visually convincing but uncomputed sunny, cloudy, dust or
storm-damage worlds.

This is one homogeneous `stress-summary` comparison. Parallel presentation
does not mean same-timestamp weather, five independent annual forecasts or
five authoritative counterfactual weather worlds.

## Decision

1. Add renderer-neutral `ScenarioComparisonFrameV1` at schema version
   `1.0.0`. Build it server-side from the full canonical
   `OperatingSnapshot`, before compact browser projection, at the same result
   identity and lifecycle as the existing Observatory.
2. Reuse the optimisation engine's deterministic stress catalog and
   calculation path. Recompute the configured baseline and four stress
   results from the canonical 8,760-hour weather record and fail closed if the
   stored optimisation record, plausible in-range deltas, scenario order,
   labels, assumptions or status do not reconcile.
3. Expose exactly five ordered chambers: configured baseline, extended summer
   heatwave, Atlantic storm week, persistent snow cover and seven-day inverter
   outage. Each chamber preserves or derives, without rounding, annual
   generation, screened net energy value and local-supply percentage together
   with generation percentage delta, energy-value percentage delta and
   local-supply percentage-point delta.
4. Define metric semantics explicitly. Energy-value delta uses the canonical
   absolute configured-baseline value denominator. The legacy
   `reliabilityDeltaPct` source field is presented as local-supply
   percentage-point delta because that is the quantity calculated by the
   optimisation engine.
5. Label the entire comparison `SIMULATED` and deterministic. It is not a
   probabilistic event forecast, extreme-event guarantee, structural study,
   bankable yield assessment or measured plant comparison. The versioned
   boundary fixes `mode: "stress-summary"`, `sameTimestampComparison: false`,
   `parallelWeatherWorlds: false` and
   `hourlyStressResultsAvailable: false`.
6. Carry explicit unavailable layers for parallel sunny/cloudy annual runs,
   dust-event dynamics, hourly stress trajectories, scenario probabilities,
   validated heatwave thresholds/attribution, observed storm meteorology,
   spatial microclimate/terrain/shadows, storm damage/structural risk,
   measured or live response and issued forecasts. The renderer and HTML
   presentation may not synthesize them.
7. Mount `I05` at position 05 with the key `scenario-comparison`. The immutable
   registry therefore contains five mounted instruments, two navigable
   placeholders and seven reserved positions. Instruments 01–04 remain formed
   and visible at reduced emphasis when Instrument 05 is active.
8. Render five normalized, side-by-side scientific chambers. Identical chamber
   geometry establishes a common comparison basis; one bounded response column
   encodes annual generation relative to the configured baseline. The
   renderer must not encode weather geometry, physical equipment, damage,
   probability, exact text or charts.
9. Keep the new spatial component behind a reach-triggered dynamic import.
   `ObservatorySceneManager` remains the sole `useFrame` owner in the existing
   demand-rendered canvas. Instrument 05 owns no frame loop, timer, random
   source, invalidation path, camera owner, texture, reflection, shadow map or
   second canvas.
10. Keep exact values, definitions, assumptions, provenance, unsupported
    layers and the user action in semantic HTML. The mounted instrument issues
    a typed activation request to the existing `SR` Scenario & Resilience
    workspace at the exact linked index without replacing the current
    device-local scenario branch or opening unrelated controls.

## Alternatives considered

- Generating five new 8,760-hour snapshots in the browser was rejected because
  it would duplicate scientific calculation, inflate the client payload and
  weaken provenance.
- Labelling whole-snapshot proving modes as already computed parallel runs was
  rejected because those results are absent from the active snapshot.
- Treating configured dust loss as a dust storm or accumulation trajectory was
  rejected because no temporal dust model exists.
- Rendering cloud volumes, rain, wind damage or equipment failure was rejected
  because the stress record provides annual outcome deltas rather than
  validated spatial or structural fields.
- Calling the local-supply delta a probability of reliability was rejected
  because the canonical calculation is an energy-balance percentage-point
  change, not an outage probability.
- Moving comparison tables, explanations or controls into WebGL was rejected
  because exact and accessible analysis remains an HTML responsibility.
- Raising the accepted spatial bundle ceiling was rejected; the new spatial
  component must be split and loaded only when its position is reached.

## Acceptance evidence

- five mounted, two placeholder and seven reserved registry entries;
- exact baseline and four canonical stress scenarios in fixed order;
- fail-closed malformed chronology, optimisation baseline, plausible
  contradictory stress deltas, status, assumptions and provenance;
- explicit unsupported sunny/cloudy, dust, hourly, probability, structural,
  live and issued-forecast layers;
- one normalized chamber comparison with no WebGL text, charts, weather
  effects, damage claim, physical-world claim or probability encoding;
- persistence at reduced emphasis of Instruments 01–04;
- one canvas, one `useFrame` owner, no local time/randomness/invalidation and
  unchanged demand-idle/adaptive-DPR behavior;
- a reach-triggered dynamic spatial chunk beneath the unchanged production
  manifest ceilings;
- semantic HTML parity, keyboard/reduced-motion operation and a typed exact
  `SR` handoff that preserves the current application branch;
- strict TypeScript, lint, focused model tests, complete visual tests, a fresh
  production build, smoke tests and private exact-source deployment.

All gates passed on 2026-07-29. The focused Scenario Comparison model tests
pass 6/6, the complete visual/Observatory suite passes 58/58 and the full
repository suite passes 103/103, including a fresh five-environment Vinext
build and 5/5 smoke checks. TypeScript and lint report zero diagnostics.

The production manifest preserves the unchanged raw ceilings: the initial
spatial closure is 1,262,543 bytes (382,126 bytes gzip) and the complete
closure is 1,453,044 bytes (441,466 bytes gzip). Instrument 05 remains outside
that initial closure and adds 9,596 raw bytes (3,799 bytes gzip) only when
reached, beneath its new 15,000-byte raw gate. These are bundle measurements,
not frame-rate claims; browser, assistive-technology and reference-device
validation remain separate evidence.

## Successor boundary

Instrument 06 may begin only after this decision is accepted with recorded
release evidence and a private deployment. It may not replace Instruments
01–05, weaken their versioned evidence boundaries, move analytical controls
into WebGL or introduce the Moon before Milestone 5.
