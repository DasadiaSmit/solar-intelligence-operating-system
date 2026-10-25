# Hero component boundary

The continuous Milestone 2–4 experience preserves the accessible introduction
and extends its journey through the Observatory above the unchanged analytical
application:

- `SolarExperience` owns only the `hero → observatory → application` phase,
  inert state and focus handoff.
- `HeliosHero` owns semantic copy, linked-frame facts, passive native-scroll
  progress and composition of the HTML Observatory controls.
- `HeliosHeroVisual` imports the lightweight canvas host directly and
  dynamically loads one persistent spatial scene.

The composition passes the versioned `SceneFrameV1`, bounded
`AtmosphericObservationFrameV1` and exact 8,760-hour `AnnualEnergyFrameV1`
plus the preservation-only `ArrayEngineeringFrameV1` and
`ScenarioComparisonFrameV1` through the same HTML/WebGL fallback boundary and
one persistent frame/canvas. Instrument 05 remains outside the initial spatial
closure and its normalized, nonphysical comparison chambers are loaded only
when position 05 is reached. It may request the existing application through
typed `DT`, `WA`, `AF`, `AE` and `SR` mounted-instrument handoffs that preserve
the exact linked index, but it does not calculate science, replace saved
scenario state, own workspace state or implement workspace content. Instrument
geometry remains in `components/3d/instruments`; the Moon, terrain, surveyed
horizon, physical module layout or shadow field, synthesized atmospheric
layers, physical/probabilistic stress chambers and invented annual forecast or
candidate-production layers do not belong here.
