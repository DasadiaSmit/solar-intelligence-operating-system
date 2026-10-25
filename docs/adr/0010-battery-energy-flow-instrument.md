# ADR 0010: Battery and energy-flow Observatory instrument

## Status

Accepted on 2026-10-25 after 135/135 automated tests, strict TypeScript, lint,
a fresh five-environment production build and unchanged initial spatial gates.
I06 is a separately gated reach-triggered module (15,823 raw bytes, below
20,000). Browser keyboard verification confirms exact-index `BE` handoff and
roving interval focus. Current evidence and verification limits are recorded
in `PROJECT_STATUS.md`; the matching native Sites version is the deployment
record. The 29 July source checkpoint is preserved separately.

## Date and accountable departments

2026-07-29. Accountable: ENERGY, TWIN and EXPERIENCE. Review boundaries:
ARCH, DATA, SOLAR, FEATURES, QA, ACCESSIBILITY, PERFORMANCE and SECOPS.

## Context and constraints

ADR 0009 mounted Scenario Comparison at position 05 while preserving one
canvas, one scene-frame owner, the existing scientific core and the analytical
application. Instrument 06 must explain how one canonical dispatch allocates
PV energy among demand, storage and the grid without replacing Instruments
01–05 or presenting simulated hourly accounting as live electrical telemetry.

The canonical `OperatingSnapshot` contains:

- one contiguous 8,760-record, 3,600-second no-leap UTC chronology;
- hourly AC generation and on-site demand;
- hourly PV-to-load, battery-charge input, battery-discharge delivery,
  battery state of charge, grid import, grid export and curtailment;
- the configured battery capacity, operating limits, efficiencies, reserve
  and self-discharge;
- annual energy, tariff, carbon and equivalent-cycle-throughput summaries; and
- provider, dataset, calculation and scenario provenance.

The values are interval energy in kWh. The canonical dispatch is a
deterministic greedy self-consumption calculation. It does not provide
instantaneous power, intra-hour ramps, physical wiring, measured inverter or
meter telemetry, cell-level BMS state, degradation, warranty life, outage
behavior, tariff-optimal scheduling, autonomous control or an issued
forecast.

The compact browser tuple intentionally omits PV-to-load, battery charge,
battery discharge and curtailment. It is therefore insufficient as the
scientific source for this instrument. The current Battery workspace also
labels compact one-hour import and export energy as `kW`, and its unchanged
base path is unnecessarily recalculated by a simplified client screening
model. Those continuity defects must be corrected without changing the
canonical dispatch engine or resetting a restored device-local scenario
branch.

The initial spatial closure has only 2,457 raw bytes of measured headroom
under its accepted ceiling. Instrument 06 therefore cannot enter the initial
scene closure.

## Decision

1. Add renderer-neutral `BatteryEnergyFlowFrameV1` at schema version `1.0.0`.
   Build it server-side from the full canonical `OperatingSnapshot`, before
   compact browser projection, at the shared result identity, lifecycle and
   linked index.
2. Preserve one exact linked 3,600-second record, the 24 records of its UTC
   day and reconciled annual totals. Record timestamp semantics as a canonical
   record anchor; do not invent an interval-start or interval-end attribution.
3. Re-run the existing demand-profile and greedy dispatch calculations from
   the canonical generation, weather and configuration. Fail closed unless
   all 8,760 stored flow records, annual totals and the snapshot summary
   reconcile with that canonical replay.
4. Validate, without rounding, both interval ledgers:
   `generation = PV-to-load + battery-charge input + grid export +
   curtailment` and `demand = PV-to-load + battery-discharge delivery + grid
   import`. Validate state-of-charge recurrence after bounded self-discharge,
   charge and discharge efficiencies, configured state bounds, reserve,
   hourly power limits and mutually exclusive directions.
5. Name annual quantities precisely. `generationRetainedOnSiteKWh` means
   generation less export and curtailment, including charger input.
   `localSupplyToLoadKWh` means PV-to-load plus battery discharge delivered to
   demand. Do not use the ambiguous source label `selfConsumedKWh` for both.
6. Define the boundary as `SIMULATED`, deterministic, AC-side one-hour energy
   accounting using greedy self-consumption. Explicitly deny measured
   telemetry, live control, forecast-aware or tariff-optimal scheduling,
   autonomous control, islanding, battery-to-grid arbitrage, an issued
   schedule and bankable assessment.
7. Carry explicit unavailable layers for instantaneous power and intra-hour
   direction, physical wiring or meter topology, measured plant and BMS
   telemetry, voltage/current/temperature, state of health, degradation and
   warranty life, protection and cell balancing, dynamic tariff/carbon/grid
   events, dispatch uncertainty, alternative optimization trajectories,
   outage/islanding/backup behavior and attributable interval boundaries.
   The renderer and HTML presentation may not synthesize them.
8. Mount `I06` at position 06 with the key `battery-energy-flow`. The immutable
   registry then contains six mounted instruments, one navigable placeholder
   and seven reserved positions. Instruments 01–05 remain formed at reduced
   emphasis when Instrument 06 is active.
9. Render a normalized logical allocation schematic with one PV source, one
   distribution bus, demand, a bounded battery reservoir, one bidirectional
   grid intertie and a curtailment sink. Static directional channels may
   encode linked-day accumulated route magnitude through bounded width and
   luminance; inactive routes remain identifiable. The geometry is not
   physical wiring, live power flow or an equipment replica. Exact values and
   definitions remain HTML.
10. Satisfy “the camera follows energy” with a deterministic,
    scroll-progress-derived look-target sweep over the I05-to-I06 transition:
    source/bus, battery/load, then grid intertie, settling exactly on the
    existing position-06 camera anchor. It adds no timeline, timer or frame
    owner. Reduced motion uses the stable endpoint without the explanatory
    sweep.
11. Keep Instrument 06 behind a reach-triggered dynamic import owned by the
    outer Hero boundary. It owns no `useFrame`, timer, random source,
    invalidation path, texture, particle system, shadow, post-processing path,
    pointer control or second canvas.
12. Keep the exact ledger, units, quality, equivalent-cycle-throughput label,
    residuals, provenance, limitations and action in semantic HTML. The action
    issues a typed request to the existing `BE` workspace at the same linked
    index, waits for state acknowledgement and focuses the selected interval.
    It preserves any restored device-local scenario branch.
13. Make the unchanged application scenario use the canonical compact base
    result directly. Continue using the existing client approximation only
    for a modified branch, retain its screening disclosure, and never imply
    that a modified branch is identical to the canonical Observatory frame.
14. Correct Battery-workspace import/export units to `kWh` for a one-hour
    interval. Give the selected interval `aria-current="time"` and a stable
    focus target, include the full timestamp, state of charge, import and
    export in its accessible name, and use one roving tab stop with
    Arrow/Home/End operation.

## Implementation sequence

1. Add and test the fail-closed frame, canonical replay and immutable client
   view.
2. Add the semantic HTML readout and explicit unsupported-layer list.
3. Correct canonical-base parity and the Battery workspace's units, focus and
   keyboard semantics.
4. Mount the registry, presentation, activation and camera boundaries.
5. Add the reach-triggered spatial schematic without changing the initial
   closure ceilings.
6. Run strict TypeScript, lint, focused model tests, the complete Observatory
   suite, production build, smoke checks, bundle gates and source hygiene.
7. Update scientific, accessibility, performance, architecture and continuity
   records; change this ADR to Accepted only after all gates pass.
8. Merge the exact validated source tree into the existing private Sites
   source history, save a private version and deploy that saved version.

## Alternatives considered

- Deriving the instrument from the compact client tuple was rejected because
  the tuple omits four required routing quantities.
- Treating one-hour kWh as instantaneous kW was rejected because it changes
  the scientific meaning of the record.
- Reusing the simplified client screening dispatch as the canonical base was
  rejected because it changes initial state, limits, efficiencies, reserve
  and self-discharge.
- Drawing separate import and export grid destinations was rejected because
  they are opposite directions through one intertie.
- Animating particles through conduits was rejected because motion would imply
  live flow and sub-hour timing that are unavailable.
- Drawing a physical battery pack, cables, inverter or meter arrangement was
  rejected because no surveyed topology or equipment model exists.
- Moving exact values, route labels, controls or the 24-hour selector into
  WebGL was rejected because analytical and accessible content remains an
  HTML responsibility.
- Raising the accepted initial spatial ceilings was rejected. The instrument
  must remain outside the initial closure and meet its own reached-only gate.

## Acceptance evidence required

- six mounted, one placeholder and seven reserved registry entries;
- exact linked-hour, linked-day and annual energy preservation;
- full canonical demand/dispatch replay and fail-closed chronology,
  configuration, flow, balance, state-of-charge, summary and provenance
  corruption;
- explicit one-hour energy units and unsupported live/BMS/degradation layers;
- one logical grid intertie and bounded battery reservoir with no physical
  topology or live-flow claim;
- persistence at reduced emphasis of Instruments 01–05;
- one canvas, one `useFrame` owner, no local time/randomness/invalidation and
  unchanged demand-idle/adaptive-DPR behavior;
- a reach-triggered Instrument 06 chunk beneath its dedicated raw gate and
  outside both accepted initial spatial closures;
- semantic HTML parity, roving interval keyboard operation, exact-index focus
  handoff, reduced motion and forced-colour/WebGL-off equivalence;
- strict TypeScript, lint, focused tests, complete visual tests, a fresh
  production build, smoke checks and private exact-source deployment.

## Successor boundary

Instrument 07 may begin only after this decision is accepted with recorded
release evidence and a private deployment. It may not replace Instruments
01–06, weaken their versioned evidence boundaries, add regional values without
a connected source or introduce the Moon before Milestone 5.
