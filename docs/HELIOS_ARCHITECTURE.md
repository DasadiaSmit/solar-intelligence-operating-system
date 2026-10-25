# Helios visual-computing architecture

## Current milestone boundary

Milestone 4 Increment 06 source extends the continuous Observatory without
replacing its Milestone 3 foundation or Increments 01–05. Release acceptance
and deployment are tracked separately in `PROJECT_STATUS.md`. The Helios Core,
procedural Sun, Solar Digital Twin, Atmospheric Observation, Annual Energy
Observatory, Solar Array Engineering, Scenario Comparison and Battery
Energy-Flow instruments remain inside one
persistent lazy canvas
while native scroll moves a cinematographic camera and calibrated ring through
seven stops. Semantic HTML owns all names, navigation, exact facts, provenance,
availability, editability boundaries, instructions, limitations and
application actions.

The Observatory contains exactly fourteen equally spaced structural positions.
Position 01 contains the mounted configured-orientation Solar Digital Twin.
Position 02 contains the mounted static one-hour Atmospheric Observation
transfer schematic. Position 03 contains the 8,760-sample Annual Energy
Observatory; Instruments 01 and 02 remain formed at reduced emphasis while it
appears. Position 04 contains the normalized, nonphysical Solar Array
Engineering orientation and incidence instrument; Instruments 01–03 remain
formed at reduced emphasis while it appears. Position 05 contains five
normalized deterministic annual stress-summary chambers; Instruments 01–04
remain formed at reduced emphasis while it appears. Position 06 contains a
static canonical energy-allocation schematic with one grid intertie and an
operating-band SOC reservoir; Instruments 01–05 remain formed at reduced
emphasis while it appears. The registry contains six mounted instruments,
one navigable placeholder at 07 and seven reserved positions at 08–14.
No physical module field, module count,
named inverter curve, terrain, surveyed horizon, measured cloud geometry,
cloud motion, physical shadow field, issued annual forecast, Moon or invented
scientific value exists.
The existing analytical shell remains mounted, inert and hidden from assistive
technology until the typed `DT`, `WA`, `AF`, `AE`, `SR` or `BE` request is
applied and focus is handed to its primary stage, acknowledged engineering
control or acknowledged linked battery interval.

## Module boundaries

| Module | Responsibility | Explicit non-responsibility |
| --- | --- | --- |
| `features/visual-computing/scene-frame.ts` | Versioned renderer-neutral scene contract and ENU conversion | Solar-position calculation, provider interpretation or new scientific values |
| `features/visual-computing/build-scene-frame.ts` | Fail-closed adapter from existing linked UI state | Mutation of scientific or application state |
| `features/visual-computing/atmospheric-observation-frame.ts` | Versioned, bounded representative-hour atmospheric contract with explicit unavailable layers | Annual transport expansion, cloud reconstruction, causal inference or live telemetry |
| `features/visual-computing/build-atmospheric-observation-frame.ts` | Fail-closed server adapter from the full canonical `OperatingSnapshot` at the linked index | Provider calculation, tuple mutation or invented atmospheric values |
| `features/visual-computing/atmospheric-observation-view.ts` | Immutable validation/preservation view over the atmospheric frame | Scientific recalculation, imputation or unavailable-layer synthesis |
| `features/visual-computing/annual-energy-frame.ts` | Versioned exact 8,760-hour annual contract, reconciled summaries, empirical spread and unavailable layers | Issued forecast, calibrated interval, measured output or renderer coordinates |
| `features/visual-computing/build-annual-energy-frame.ts` | Fail-closed server adapter from the full canonical `OperatingSnapshot` | Compact-tuple reuse, display rounding or forecast recalculation |
| `features/visual-computing/annual-energy-view.ts` | Immutable validation/preservation view over the annual frame | Downsampling, normalization or unavailable-layer synthesis |
| `features/visual-computing/array-engineering-frame.ts` | Versioned configured/resolved array, linked-hour incidence, annual/loss-chain and explicit capability boundary | Module, inverter or shadow synthesis; astronomical mutation; renderer coordinates |
| `features/visual-computing/build-array-engineering-frame.ts` | Fail-closed exact-index adapter from the full canonical `OperatingSnapshot` | Candidate simulation, display rounding or client-side authoritative recalculation |
| `features/visual-computing/array-engineering-view.ts` | Immutable validation/preservation view over the array-engineering frame | Scientific recalculation, equipment selection or unavailable-layer synthesis |
| `features/visual-computing/scenario-comparison-frame.ts` | Versioned homogeneous deterministic stress-summary comparison, exact metric semantics, provenance and unavailable layers | Same-time weather worlds, hourly stress synthesis, probability or renderer coordinates |
| `features/visual-computing/build-scenario-comparison-frame.ts` | Fail-closed canonical configured-stress replay and reconciliation from the full `OperatingSnapshot` | New optimisation formula, client screening branch or forecast generation |
| `features/visual-computing/scenario-comparison-view.ts` | Immutable validation/preservation view over the comparison frame | Recalculation, interpolation or unavailable-layer synthesis |
| `features/visual-computing/battery-energy-flow-frame.ts` | Versioned one-hour/linked-day/annual energy ledger with conservation, SOC, units, provenance and eleven unavailable layers | Physical topology, live telemetry, optimal dispatch or renderer coordinates |
| `features/visual-computing/build-battery-energy-flow-frame.ts` | Fail-closed server adapter replaying canonical demand and dispatch over all 8,760 records | New dispatch formula, compact-tuple reconstruction or client branch promotion |
| `features/visual-computing/battery-energy-flow-view.ts` | Immutable validated ledger plus bounded linked-day route ratios and operating-band SOC fill | Scientific recalculation or unsupported-layer synthesis |
| `features/visual-computing/renderer-policy.ts` | Demand rendering, quality tier, DPR and semantic-particle budgets | Frame-rate claims or device benchmarking |
| `components/3d/HeliosCanvas.tsx` | SSR-safe lazy boundary, required HTML fallback and local render-failure containment | Route, workspace or scientific-state ownership |
| `components/3d/HeliosCanvasRenderer.tsx` | React Three Fiber canvas lifecycle and WebGL context-loss reporting | Continuous animation or interaction |
| `components/3d/HeliosCamera.tsx` | Declarative, cinematographer-controlled camera | OrbitControls or free user spinning |
| `features/visual-computing/observatory-model.ts` | Immutable positions, calibrated progress, visibility and marker presentation | Existing workspace registry or instrument capability |
| `features/visual-computing/observatory-instrument-registry.ts` | Immutable mounted/placeholder/reserved instrument contract | React, Three.js or workspace implementation |
| `features/visual-computing/observatory-instrument-presentation.ts` | Pure dial-driven formation state | Timers, frame ownership or renderer mutation |
| `features/visual-computing/solar-digital-twin-view.ts` | Fail-closed preservation view over `SceneFrameBuildResult` | Scientific recalculation or unavailable-layer synthesis |
| `features/application-activation.ts` | Mounted-instrument requests mapping I01 to `DT`, I02 to `WA`, I03 to `AF`, I04 to `AE` plus acknowledged control focus, I05 to `SR` and I06 to `BE` plus acknowledged linked-interval focus, all at the exact linked index | Workspace rendering, scenario replacement or application-state persistence |
| `features/visual-computing/observatory-motion.ts` | Immutable camera anchors and finite interpolation | Camera input, rendering or scientific state |
| `components/hero/SolarExperience.tsx` | Hero/Observatory/application inert state and focus handoff | Scientific or workspace state |
| `components/hero/HeliosHero.tsx` | Semantic entry composition and continuous native-scroll journey | WebGL calculations or intercepted scrolling |
| `components/hero/HeliosHeroVisual.tsx` | Lightweight fallback and dynamic scene boundary | Three.js static imports |
| `components/observatory/useObservatoryScrollEngine.ts` | Passive, RAF-coalesced native-scroll observation and direct position travel | Wheel/touch cancellation, snapping or science state |
| `components/observatory/ObservatoryStateManager.tsx` | Controlled presentation state for semantic Observatory controls | Duplicate business logic or persistence |
| `components/observatory/ObservatoryNavigation.tsx` | Clickable/keyboard HTML dial and reserved-position disclosure | WebGL interaction or workspace selection |
| `components/observatory/ObservatoryReadout.tsx` | Current position, mounted-instrument/placeholder routing and HTML actions | Scientific recalculation or WebGL output |
| `components/observatory/AtmosphericObservationReadout.tsx` | Exact I02 one-hour facts, lifecycle, quality, provenance, causal boundary and unavailable-layer disclosure | Cloud inference, live telemetry or spatial calculation |
| `components/observatory/AnnualEnergyReadout.tsx` | Exact I03 annual, monthly, seasonal, quality, empirical-spread and unsupported-layer facts | Forecast recalculation, calibration claim or WebGL output |
| `components/observatory/ArrayEngineeringReadout.tsx` | Exact I04 configuration, linked incidence, annual/loss-chain facts, editability boundary, provenance and unsupported-layer disclosure | Candidate calculation, equipment recommendation or WebGL output |
| `components/observatory/ScenarioComparisonReadout.tsx` | Exact I05 annual table, metric definitions, assumptions, provenance and unavailable-layer disclosure | Weather simulation, probability inference or WebGL output |
| `components/observatory/BatteryEnergyFlowReadout.tsx` | Exact I06 interval/day/annual HTML ledger, units, residuals, limits, quality, provenance and eleven unavailable-layer disclosures | Instantaneous power, live control, degradation prediction or physical wiring |
| `components/3d/HeliosHeroScene.tsx` | Stable lazy proxy retained from Milestone 2 | Independent scene ownership |
| `components/3d/ObservatorySceneManager.tsx` | Sole frame coordinator and scene composition | Linked-time/scenario mutation |
| `components/3d/ObservatoryCameraController.ts` | One paused GSAP Hero timeline plus pure Observatory camera poses | Orbit/free camera control |
| `components/3d/ObservatoryInstrumentManager.tsx` | Structural transform boundary, six implemented mounts and eight empty anchors, with reach-gated I05/I06 content | Instrument-local timing or scientific derivation |
| `components/3d/instruments/SolarDigitalTwinInstrument.tsx` | Texture-free logical collection/conversion/demand/storage/grid topology | Physical site replica, charts, labels or controls |
| `components/3d/instruments/AtmosphericObservationInstrument.tsx` | Static, texture-free linked-hour transfer schematic using supplied scalar channels | Cloud altitude/type/geometry/motion, wind direction, vertical profile, sub-hour or causal response |
| `components/3d/instruments/AnnualEnergyInstrument.tsx` | One-draw exact 8,760-instance annual chronology and production formation | Charts, text, sample dropping, forecast inference or independent animation |
| `components/3d/instruments/ArrayEngineeringInstrument.tsx` | Normalized nonphysical aperture, resolved normal, authoritative linked Sun vector and incidence relationship | Module rows, capacity-as-area, physical shadowing, terrain, charts, text or controls |
| `components/3d/instruments/ScenarioComparisonInstrument.tsx` | Reach-triggered normalized baseline/stress chambers with one bounded relative-generation channel | Weather effects, exact values, probability, physical-world claims, charts, text or controls |
| `components/3d/instruments/BatteryEnergyFlowInstrument.tsx` | Reach-triggered static logical routing, one grid intertie and bounded SOC reservoir | Physical wiring, live flow, particles, frame ownership, exact values or controls |
| `components/3d/instruments/ObservatoryInstrumentMount.tsx` | Stable position and imperative formation transform | Scroll, timers or frame loops |
| `components/3d/InstrumentRingStructure.tsx` | One precision ring and fourteen instanced fiducials | Labels, input or scientific data |
| `components/3d/HeliosCore.tsx` | Six deterministic subsystem rings and instanced index marks | Measured physical geometry |
| `components/3d/SolarBody.tsx` | Texture-free procedural plasma surface and corona | Solar physics or observed solar imagery |
| `components/3d/MagneticFieldLoops.tsx` | Deterministic schematic field topology | Magnetogram or measured field claim |
| `components/3d/HeliosPostProcessing.tsx` | Tier-gated restrained bloom, AO and vignette | Distortion, grain or decorative spectacle |
| `components/3d/LightingSystem.tsx` | Reusable restrained lighting modes | Simulated weather or irradiance |
| `components/3d/EnvironmentSystem.tsx` | Background/fog composition supplied by a future scene | Invented terrain, horizon or HDR environment |
| `components/3d/ParticleSystem.tsx` | Instanced rendering of externally supplied semantic points | Random generation, decorative motion or scientific simulation |
| `components/ui/ScientificRendererFallback.tsx` | Semantic HTML explanation and facts when WebGL is absent | Visual calculation or hidden data transformation |

## Versioned scientific-to-spatial handoffs

### SceneFrameV1

`SceneFrameV1` remains the versioned handoff for the Helios context and Solar
Digital Twin.

- Solar azimuth is degrees clockwise from true north.
- Scientific vectors use named ENU components: east, north and up.
- Three.js maps ENU to `x = east`, `y = up`, `z = -north`.
- The current browser transport is one-hour data. Generation, demand and grid
  values therefore retain the honest `kWh/1h` interval unit rather than being
  relabelled as instantaneous power.
- Timestamp, quality, lifecycle, provider, dataset version, calculation version
  and evidence references survive adaptation.
- Direct, diffuse and reflected irradiance, module geometry, terrain and
  surveyed horizon remain explicitly unavailable because the compact transport
  does not contain authoritative values for them.
- Invalid time, solar state, units or provenance produces a structured
  unavailable result; it never produces mesh coordinates.

This is a rendering contract. It does not alter or supersede the solar engine.

### AtmosphericObservationFrameV1

`AtmosphericObservationFrameV1` is a separate bounded contract for Instrument
02. It is built server-side from the full canonical `OperatingSnapshot` before
annual browser compaction, at `HERO_LINKED_HOUR_INDEX` and under the same
result ID as the Hero scene. It does not change `SceneFrameV1`, the compact
14-value `sios-hour-tuple-v1`, an API or a scientific calculation.

- Schema version is `1.0.0`; interval length is exactly 3,600 seconds.
- The frame preserves the canonical timestamp, cloud cover, relative humidity,
  wind speed, ambient temperature, GHI, DNI, DHI, effective POA, modelled AC
  energy, configured DC capacity, full quality state, units, lifecycle,
  provider, dataset/calculation versions and evidence-reference IDs.
- Credential-free sample output is labelled `SIMULATED`.
- Weather, irradiance and AC energy have the temporal basis
  `coincident-one-hour-interval`; `causalityClaim` is always false.
- Wind direction, cloud altitude/type/geometry/motion, sub-hour response and
  measured/live plant output are explicit unavailable records with reasons.
- Invalid identity, lifecycle, interval, values or provenance produces a
  structured unavailable result; it never produces spatial content.

This bounded frame allows the instrument to expose exact canonical DNI/DHI
without inflating the 8,760-row browser tuple. It is an evidence adapter, not a
weather observation service or cloud simulator.

### AnnualEnergyFrameV1

`AnnualEnergyFrameV1` is the separate renderer-neutral contract for Instrument
03. It is built server-side from the full canonical `OperatingSnapshot`, before
compact browser projection, and preserves all 8,760 unrounded hourly modelled
AC values and quality scores.

- Schema version is `1.0.0`; the calendar is exactly one contiguous non-leap UTC
  year of 8,760 3,600-second records.
- The hourly series serializes only `generationAcKWh` and `qualityScores`.
  Chronological index and UTC month are reconstructed from the versioned start
  timestamp and interval rather than repeated in the payload.
- Hourly energy reconciles without display rounding to twelve monthly totals,
  four northern/southern meteorological-season totals and the annual summary.
- Configured capacity, peak one-hour AC value, specific yield, mean quality,
  lifecycle, units, representative-year identity and provenance remain exact.
- P10/P50/P90 are an empirical interannual spread over four source-year annual
  totals (`n = 4`). They are not a calibrated probabilistic interval, issued
  future forecast or guarantee.
- Measured/live plant output, issued future forecast, intra-hour variation,
  spatial generation field and causal climate attribution are explicit
  unavailable records.
- Invalid calendar geometry, values, summaries, reconciliation, empirical
  spread, identity or provenance produces a structured unavailable result.

This annual frame does not change `SceneFrameV1`,
`AtmosphericObservationFrameV1`, the 14-value `sios-hour-tuple-v1`, an API or a
scientific calculation.

### ArrayEngineeringFrameV1

`ArrayEngineeringFrameV1` is the separate renderer-neutral contract for
Instrument 04. It is built server-side from the full canonical
`OperatingSnapshot` at the exact linked hour and preserves the accepted result
identity, lifecycle and evidence lineage without running a second calculation.

- Configured capacity, tilt, azimuth, tracking mode, panel technology, DC/AC
  ratio, bifaciality, temperature coefficient, degradation, system age and
  nominal generic inverter efficiency retain their canonical meanings.
- Resolved tilt and azimuth remain separate from configured values. The
  current fixed configuration resolves to the same orientation.
- The linked timestamp, authoritative ENU Sun direction, solar angles,
  angle of incidence, incidence-angle modifier, irradiance, modelled energy,
  loss factors, quality and provenance are copied from the same canonical
  snapshot index.
- Annual energy, specific yield and loss-chain summaries are preservation
  facts, not candidate-response calculations. Before release, linked POA and
  generation are compared with the existing canonical functions, annual
  output/peak/performance/quality reconcile across exactly 8,760 hours and the
  loss chain matches the canonical ordered builder.
- `arrayConfigurationAffectsSunPath` is always false. Array settings can change
  the aperture orientation relative to the Sun; they cannot move the Sun or
  rewrite astronomical state.
- The existing DC-capacity, tilt, azimuth and aggregate-loss controls are
  explicitly client-side `SIMULATED` screening controls. An authoritative
  server recalculation is required before engineering reliance and the
  Observatory does not patch or reset the saved device-local scenario.
- Module count/rating and dimensions, row/placement geometry, named inverter
  equipment/curves, module efficiency, editable inverter efficiency, physical
  terrain/horizon/shadows, candidate hourly production, measured/live output
  and authoritative client recalculation are explicit unavailable layers.
- Invalid identity, index, time, orientation, linked physics, loss
  reconciliation, annual summary or provenance produces a structured
  unavailable result.

This frame does not change the canonical solar engine, an API,
`SceneFrameV1`, either prior instrument frame or the compact browser tuple.

### ScenarioComparisonFrameV1

`ScenarioComparisonFrameV1` is the separate renderer-neutral contract for
Instrument 05. It is built server-side from the full canonical
`OperatingSnapshot` and uses one homogeneous `stress-summary` mode.

- One configured baseline and four catalogued deterministic annual stress
  results appear in fixed order.
- The builder replays the existing configured stress calculation against the
  exact contiguous 8,760-hour weather chronology and fails closed unless the
  stored optimisation baseline, stress values, labels, assumptions, status,
  annual summary and provenance reconcile.
- Annual generation, screened net energy value, local supply and all deltas
  remain unrounded contract values. Energy-value percentage uses the absolute
  configured-baseline value denominator; the legacy `reliabilityDeltaPct`
  source field is exposed as local-supply percentage points.
- Parallel presentation is not same-timestamp comparison, five alternate
  weather worlds, hourly stress output, an independently issued forecast or a
  probability model.
- Sunny/cloudy parallel results, dust-event dynamics, validated
  heatwave-threshold/attribution evidence, observed storm meteorology,
  serialized hourly stress trajectories, probabilities, spatial microclimate/
  terrain/shadows, structural risk, measured/live response and issued
  forecasts remain explicit unavailable layers.
- Invalid chronology, plausible contradictory values, catalog/order,
  arithmetic, provenance or capability fields produce a structured
  unavailable result.

This frame adds no new scenario formula, API, alternate weather series,
compact-tuple column or client-side scientific calculation.

### BatteryEnergyFlowFrameV1

`BatteryEnergyFlowFrameV1` is the renderer-neutral contract for Instrument 06.
It is built from the full canonical `OperatingSnapshot`, before compact
browser projection, with the same result identity and linked index.

- Schema version is `1.0.0`; the year contains 8,760 contiguous 3,600-second
  UTC records. The frame preserves the exact linked record, all 24 records of
  its UTC day and the reconciled annual ledger. Timestamp semantics remain
  `canonical-record-anchor`; interval-start/end attribution is unavailable.
- The builder reruns the existing demand profile and greedy self-consumption
  dispatch and compares all stored flow fields and annual summaries. The
  frame validator checks PV/demand conservation, efficiency-aware SOC
  recurrence, self-discharge, reserve deliverability, configured bounds and
  mutually exclusive directions. Invalid evidence returns an unavailable
  result rather than spatial content.
- Generation retained on site includes charger input; local supply delivered
  to load is PV direct plus battery discharge. Equivalent-full-cycle
  throughput is a proxy, not a battery-life or warranty prediction.
- The view deep-copies and freezes the validated frame. Its six route
  magnitudes are normalized from accumulated linked-day energy, while the
  reservoir fill follows the configured operating SOC band. Neither changes
  the canonical quantities or the 14-value annual browser tuple.
- The current application frame is `SIMULATED`. Its eleven unavailable
  layers cover instantaneous/intra-hour power, physical topology, measured
  plant telemetry, BMS state, degradation/lifetime, protection/controller
  dynamics, dynamic tariff/carbon/grid events, uncertainty, alternative
  optimisation, outage/islanding and attributable interval boundaries.
- The typed action opens `BE` at the same index, waits for acknowledgement
  and focuses `battery-linked-interval`, preserving any restored local
  scenario. The unchanged analytical branch uses the transported canonical
  base directly; changed branches retain the disclosed client screening
  calculation.

## Rendering and quality policy

Rendering is `frameloop="demand"` from the first milestone. The canvas sleeps
when state is unchanged and is suspended while the document is hidden.

| Tier | Intended baseline | DPR cap | Semantic-particle budget | Antialiasing |
| --- | --- | ---: | ---: | --- |
| Scientific | Compact or lower-concurrency device | 1.0 | 48 | Off |
| Balanced | Tablet/laptop viewport | 1.25 | 128 | On |
| Cinematic | Capable desktop viewport | 1.5 | 256 | On |

The DPR hard ceiling is 2. Reduced motion overrides the particle budget to
zero, freezes shader/Core time, removes pointer parallax and selects framework
positions directly without smooth travel or camera inertia. In normal motion,
scroll or fine-pointer changes explicitly wake the demand renderer; the canvas
sleeps again once camera and pointer values settle. These are complexity
limits, not guaranteed frame-rate claims. Reference-device FPS remains a
separate empirical gate.

The particle system is inert when no semantic positions are supplied. It
preserves caller order, rejects non-finite positions and never calls a random
number generator. Future animation must be driven by named photon, energy or
data pathways and stop when it no longer teaches a relationship.

Instrument 02 supplies no semantic particle positions. Its cloud-cover screen,
humidity envelope, directionless wind-speed ring and irradiance paths are
static encodings of the linked hour. It adds no timer, `useFrame`, invalidation
request, cloud drift or advection. The existing scene coordinator is still the
sole frame owner, and demand rendering sleeps after camera, dial and pointer
transitions settle.

Instrument 03 retains exactly 8,760 instances in one
`InstancedBufferGeometry` draw path at every quality tier. Canonical hour
controls angle, a display-only hourly-energy/annual-peak ratio controls radial
displacement, meteorological season controls muted colour and quality may only
reduce luminance. Quality tiers change glyph geometry and point size, never
sample count. The existing sole frame owner drives its orbit-to-production
uniform; the instrument has no local frame loop, timer, random source or
invalidation path.

Instrument 04 renders a normalized orientation aperture, resolved normal,
authoritative linked Sun vector and angle-of-incidence relationship. Its
physical area is independent of configured capacity, and it renders no module
rows, terrain, horizon, obstruction field, cast/received shadow, texture or
decorative particle. Formation remains dial-driven by the existing sole frame
owner; the instrument adds no timer, random source, invalidation path or
independent motion.

Instrument 05 renders five normalized comparison chambers. Repeated stress
geometry is instanced and shares materials; one bounded response column
encodes annual generation relative to the configured baseline. The component
is dynamically imported only when position 05 is reached and remains outside
the initial spatial closure. It renders no exact values, weather effect,
physical equipment, probability, damage, texture, shadow, timer, random source,
invalidation path or independent motion.

Instrument 06 renders a static logical allocation plane containing a PV
source, distribution bus, load, battery reservoir, one bidirectional grid
intertie and curtailment sink. Bounded widths encode linked-day route energy;
opacity distinguishes linked-record activity, day-only context and dormant
paths. It is reached-only and owns no frame loop, timer, texture, particle,
invalidation path or second canvas. The existing camera controller derives
the I05-to-I06 source/bus → battery/load → grid target sweep purely from
progress. Reduced motion selects the stable path without that sweep.

## Accessibility and failure behavior

- `HeliosCanvas` requires an HTML fallback from its caller.
- The WebGL canvas is presentation-only, removed from the tab order and cannot
  intercept pointer input.
- Forced-colour mode selects the HTML path.
- Reduced motion freezes ambient time and pointer response, retains all seven
  navigable framework positions, changes to stable camera poses directly and
  keeps an explicit action into the existing application.
- WebGL absence, local render exceptions and `webglcontextlost` remain inside
  the renderer boundary and cannot take down the observatory.
- The renderer requires WebGL 2, keeps fallback content present until the first
  successful frame and permits one explicit retry per failure incident.
- Page visibility suspends the WebGL surface.
- Scientific meaning, facts, units and controls stay in semantic HTML.
- The Battery workspace labels import/export energy `kWh / 1h`. Its 24-hour
  radio group uses one roving tab stop, Arrow/Home/End navigation, at least
  24-pixel targets and `aria-current="time"`. Accessible names contain the
  full timestamp, SOC and interval import/export. Focus transfers only after
  the requested workspace and linked index are acknowledged.

## Hero and Observatory scientific interpretation

- Core geometry is an operating-system metaphor, not a measured mechanism.
- Solar direction, linked irradiance, cloud fraction and quality are the only
  scientific values that tune the Sun presentation.
- The shader surface, corona and field guides are explicitly disclosed as
  procedural or schematic and never replace the HTML facts.
- Scroll and framework navigation change presentation only. They cannot mutate the selected
  hour, scenario, forecast, evidence or scientific memory.
- The ring and fiducials are structural navigation. Instrument 01 is a logical
  configured-orientation topology, not measured equipment geometry. It remains
  visible at reduced emphasis as later instruments form.
- Instrument 02 is a one-hour atmospheric transfer schematic. Its opacity,
  thickness, colour and path magnitudes are bounded presentation encodings, not
  measured cloud geometry, altitude or vertical profile.
- The linked weather, irradiance and modelled AC values are temporally
  coincident; no visual channel claims instant causality, live synchronization
  or measured plant response.
- Instrument 03 is a normalized annual data glyph, not a physical orbit.
  Season colour is categorical calendar context rather than temperature,
  climate trend or causal attribution; exact unrounded energy remains HTML.
- Its four-year P10/P50/P90 values remain an empirical annual spread, not a
  calibrated interval, issued forecast, guarantee or measured validation.
- Instrument 04 is a normalized coordinate instrument, not a surveyed array,
  module, string, row or scale model. Its aperture and vectors explain
  orientation and incidence only.
- Array configuration never alters the authoritative astronomical Sun path.
  Physical shading is not rendered because no authoritative module placement,
  terrain, horizon or obstruction geometry exists.
- Its workspace handoff exposes the existing bounded screening controls and
  preserves the restored device-local branch. Exact canonical facts and the
  authoritative-recalculation warning remain HTML.
- Instrument 05 is a normalized annual-delta comparison, not a physical
  chamber or simultaneous weather simulation. Geometry expresses one common
  comparison basis and relative annual-generation response only; exact
  values, definitions, assumptions, provenance and unsupported layers remain
  HTML.
- Its typed `SR` handoff preserves the exact linked index and current
  device-local branch. It does not open controls, patch a scenario or promote a
  deterministic stress summary into an authoritative forecast.
- Instrument 06 explains deterministic AC-side allocation and SOC accounting.
  Its route magnitudes describe the linked UTC day, not a live electrical
  stream. One grid intertie is a logical relationship, not surveyed wiring.
  Exact interval, day and annual ledgers, residuals, units and provenance stay
  authoritative in HTML; modified local screening branches remain disclosed.
- No particles are emitted because none of the implemented instruments has an
  evidence-backed spatial flow direction/magnitude contract that requires
  them.

## Production dependency boundary

The production manifest keeps the analytical `SolarOperatingSystem` static
dependency closure free of the
Three.js renderer, Core, shader or postprocessing implementation.

The first spatial load remains isolated behind the existing lazy scene and
renderer boundaries. Instruments 05 and 06 each have a separate reach-triggered
import owned by the outer client boundary, with local suspense boundaries at
their mounts.
Smoke gates retain hard uncompressed ceilings of
1,265,000 bytes incremental and 1,465,000 bytes complete. The historical
accepted Increment 05 production manifest reported a 1,262,543-byte initial incremental
spatial closure (382,126 bytes gzip) and 1,453,044-byte complete initial
spatial closure (441,466 bytes gzip). The continuous scene asset before the
reach-triggered I05 module is 350,016 bytes (140,503 bytes gzip). Instrument 05
adds 9,596 raw bytes (3,799 bytes gzip) only when reached, beneath its separate
15,000-byte raw gate. The analytical shell asset is
154,572 bytes raw (41,446 bytes gzip), and its static closure remains free of
Three.js. Instrument 03 adds no dependency, texture, canvas or frame loop; its
hourly series sends only energy and quality columns. Instrument 04 likewise
adds no dependency, texture, canvas or frame loop and does not extend the
compact 14-value browser tuple. Instrument 05 adds no runtime dependency,
texture, canvas or frame loop and also leaves that tuple unchanged. Raw
ceilings are automated; gzip values are recorded measurements. Asset sizes are
engineering budgets, not runtime FPS evidence.

These measurements describe the accepted I05 release, not I06 acceptance.
Instrument 06 must remain outside the initial spatial closure, satisfy its
dedicated reached-only bundle gate and retain the existing initial ceilings.
Fresh measurements and release results belong in `docs/PERFORMANCE.md` and
`PROJECT_STATUS.md`; this source description does not claim those gates passed.

## Milestone progression

Finish and accept Instrument 06 before beginning Instrument 07 as a separate
Milestone 4 increment, using the same registry, scene, state, navigation,
HTML-fallback and typed-handoff boundaries. Instrument 07 may not replace
Instruments 01–06, change their versioned frame contracts or redesign an
analytical workspace. The Moon remains prohibited until the
operational-frequency shift in Milestone 5 and must never imply lunar
ephemeris without an authoritative astronomical source.
