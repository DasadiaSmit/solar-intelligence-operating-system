# Observatory component boundary

The Milestone 3 continuous framework and Milestone 4 mounted-instrument
semantics meet here:

- `useObservatoryScrollEngine` observes native scroll without interception.
- `ObservatoryStateManager` exposes controlled presentation state only.
- `ObservatoryNavigation` provides the calibrated, keyboard-operable HTML dial.
- `ObservatoryReadout` routes mounted-instrument or placeholder content.
- `AtmosphericObservationReadout` exposes the exact one-hour Instrument 02
  facts, lifecycle, quality, provenance, coincident/not-causal relationship and
  unavailable layers.
- `AnnualEnergyReadout` exposes Instrument 03's exact annual/monthly/seasonal
  reconciliation, quality, representative-year identity, empirical `n = 4`
  P10/P50/P90 boundary, provenance and five unavailable layers.
- `ArrayEngineeringReadout` exposes Instrument 04's exact configured/resolved
  orientation, linked Sun/incidence/irradiance/conversion/loss evidence,
  annual base output, supported screening-control boundary, provenance and
  unavailable module/inverter/efficiency/shadow layers.
- `ScenarioComparisonReadout` exposes Instrument 05's configured baseline and
  four canonical deterministic stress cases in an exact semantic HTML table,
  with chronology, lifecycle, quality, metric definitions, provenance and all
  ten unavailable-layer disclosures.

The immutable 14-position registry is independent of the existing 14
analytical workspaces. Positions 01 and 02 contain the mounted Solar Digital
Twin and Atmospheric Observation instruments, position 03 contains Annual
Energy Observatory, position 04 contains Solar Array Engineering and position
05 contains Scenario Comparison. Thus five positions are mounted, two
positions (06–07) remain framework placeholders and seven (08–14) are
reserved. Earlier instruments remain spatially present at subdued emphasis
when a later mounted position is active.

Components in this directory own semantic presentation and typed activation
requests only. They do not calculate or impute science, own application
workspace state, create WebGL geometry, infer cloud motion/geometry, or
derive annual statistics or introduce the Moon. Exact facts and `DT`/`WA`/`AF`
and `AE` actions remain available without WebGL; Instrument 05 uses the same
typed, same-index handoff to `SR`.
