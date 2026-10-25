# Performance and transport note

## Measured integration behavior

The first integrated browser pass transported the complete nested `OperatingSnapshot`—all weather, sun, irradiance, loss, flow, forecast and quality fields for 8,760 hours—through the React Server Component boundary. In the development runtime this produced response times measured in tens of seconds and eventually disconnected the client during repeated hot reloads.

The scientific calculation itself was not the failure: the integrated annual invariant test completed in about 2.4 seconds, and the full simulation API remained correct.

## Implemented correction

`lib/client-snapshot.ts` defines the versioned `sios-hour-tuple-v1` transport. It projects each canonical hour to the 14 numeric values consumed by the interactive shell:

1. GHI
2. effective POA
3. ambient temperature
4. cloud fraction
5. AC energy/power-equivalent for the one-hour interval
6. P10
7. P90
8. demand
9. battery state of charge
10. grid import
11. grid export
12. quality
13. solar elevation
14. solar azimuth

Time is reconstructed from the versioned start timestamp and one-hour interval; the array index is the canonical row index. Numeric rounding is limited to browser-display precision. The full nested, auditable 8,760-hour record remains available from `POST /api/v1/simulate` and is not replaced by the UI projection.

After this change, clean development document requests completed in approximately 2.5–3.2 seconds including deterministic construction of the full annual snapshot. Workspace interactions themselves are client-local.

Milestone 4 Increment 02 does not extend this tuple. The page builds one
bounded `AtmosphericObservationFrameV1` on the server from the full canonical
`OperatingSnapshot`, before `compactOperatingSnapshot`, at the same
representative-hour index and result ID as the Hero scene. That single frame
adds exact humidity, wind speed, DNI and DHI for Instrument 02 without adding
columns to each of the 8,760 client rows. The tuple remains exactly 14 numeric
values per hour and `SceneFrameV1` remains unchanged.

Increment 03 likewise leaves that tuple unchanged. Its server-built
`AnnualEnergyFrameV1` preserves all 8,760 unrounded canonical hourly AC values
and quality scores from the full `OperatingSnapshot`. Only those two hourly
series columns are serialized. Canonical hour index and UTC month are derived
from the versioned start timestamp and 3,600-second interval, avoiding three
redundant 8,760-row index/timestamp/month columns. The no-leap calendar,
monthly/seasonal/annual reconciliation, empirical spread and provenance remain
fail-closed frame metadata rather than renderer calculations.

Increment 04 also leaves the tuple unchanged. Its server-built
`ArrayEngineeringFrameV1` preserves configured/resolved array facts, the exact
linked-hour Sun/incidence/irradiance/energy state, loss-chain and annual summary
from the full canonical snapshot. Its bounded daily Sun-path samples are copied
from authoritative canonical hours rather than synthesized in the browser.
Module, equipment, geometry, shadow and candidate-production layers remain
explicitly unavailable rather than increasing transport with invented data.

Increment 05 also leaves the tuple unchanged. Its server-built
`ScenarioComparisonFrameV1` replays the configured baseline and four canonical
deterministic annual stress summaries against the full 8,760-hour snapshot
before compact projection. The browser receives five bounded annual summary
records plus definitions, provenance and unavailable-layer evidence; no
alternate weather chronology or hourly stress series is transported.

Increment 06 also leaves the tuple unchanged. Its server-built
`BatteryEnergyFlowFrameV1` validates the canonical baseline against a
chronological dispatch replay, then transports the exact linked hour, its
24-hour day and an annual energy ledger. It does not serialize another
8,760-hour browser series. The renderer consumes the resulting frame; it does
not run dispatch or change the canonical snapshot. Eleven unsupported battery
and network layers remain explicitly unavailable.

## Built asset budget

The production smoke test enforces a 250 kB uncompressed budget for the
workspace-specific client module. In the measured Milestone 4 Increment 06
build,
`SolarOperatingSystem` is **155,978 bytes uncompressed** (**41,838 bytes
gzip**). Its static dependency closure contains no Three.js renderer, Core,
shader, postprocessing, GSAP camera controller or OrbitControls implementation.

The spatial graph loads only when `HeliosCanvas` selects WebGL 2:

| Production boundary | Uncompressed | Gzip |
| --- | ---: | ---: |
| Analytical workspace entry | 155,978 B | 41,838 B |
| Continuous Observatory scene before reach-triggered modules | 350,636 B | 140,479 B |
| **Incremental initial spatial closure** | **1,263,187 B** | **381,161 B** |
| **Complete initial spatial closure** | **1,453,688 B** | **440,465 B** |
| Instrument 05 unique reach-triggered closure in this build | 9,596 B | 3,790 B |
| **Instrument 06 unique reach-triggered closure** | **15,823 B** | **4,967 B** |

Automated ceilings remain 1,265,000 bytes incremental and 1,465,000 bytes
complete. Increment 06 remains within both accepted hard gates and introduces
no runtime dependency, texture, canvas or frame loop. Its dynamic module stays
outside the initial spatial closure until position 06 is reached and is
separately limited to 20,000 raw bytes. The initial boundary has 1,813 raw
bytes of remaining headroom, so any later instrument must reuse or split
existing code rather than raising the ceiling by default. Gzip values are
recorded engineering measurements; raw ceilings are automated. These sizes are
not FPS evidence.

The previous Increment 05 build measured 154,572 B / 41,446 B gzip for the
workspace entry, 350,016 B / 140,503 B for the scene, 1,262,543 B / 382,126 B
for the incremental initial closure, 1,453,044 B / 441,466 B for the complete
initial closure, and 9,596 B / 3,799 B for its unique reach-triggered module.
Those are historical I05 measurements, not the current I06 artifact sizes.

## Rendering strategy

- Canvas is used for the 8,760-cell Production DNA, annual chronology and orbital timeline rather than creating thousands of DOM nodes.
- Only the active workspace is mounted.
- The scientific inspector and linked cursor reuse normalized client state.
- Animations stop under `prefers-reduced-motion`.
- Fixed shell regions clip intentional instrument graphics and independently scroll analytical content.
- Helios uses demand rendering, document-visibility suspension and adaptive
  DPR caps of 1.0, 1.25 and 1.5, with a hard ceiling of 2.
- Scientific/balanced/cinematic tiers change ring and Sun tessellation.
  Cinematic AO is half-resolution; postprocessing is disabled on the
  scientific tier. Low-capability devices use the scientific tier regardless
  of viewport width.
- One scene coordinator owns Core, Sun, field, structural dial, all six mounted
  instrument formations and camera motion. Instrument modules have no frame
  loop or invalidation path. Instrument 01 remains visible at reduced emphasis
  while Instruments 02 and 03 form; Instrument 02 likewise remains subdued when
  Instrument 03 becomes active, and Instruments 01–03 remain subdued when
  Instrument 04 becomes active, and Instruments 01–04 remain subdued while
  Instrument 05 forms; Instruments 01–05 remain subdued while Instrument 06
  forms. Scroll and fine-pointer updates wake demand
  rendering; the canvas stops invalidating after camera and pointer inertia
  settle. Elapsed time is delta-clamped and modulo-bounded only while those
  transitions render.
- Reduced motion fixes time at zero, removes pointer parallax, disables
  particles and selects each requested stable position without a long scrub.
- Semantic-particle budgets are capped at 48, 128 and 256 instances during
  animated operation. Instruments 01–04 emit none because their linked frames
  do not define an authoritative spatial flow direction/magnitude pathway.
  Instrument 02 has no cloud drift or advection animation. Instrument 03 keeps
  exactly 8,760 samples in one `InstancedBufferGeometry` draw path; tiers vary
  glyph geometry and point size without dropping data, and the sole scene
  coordinator drives its formation uniform. Instrument 04 uses a normalized
  aperture and supplied vectors only; it adds no terrain, physical shadow map,
  texture, timer, frame loop or capacity-dependent geometry. Instrument 05
  uses shared baseline/stress primitives and instanced repeated stress
  geometry; it adds no weather effect, per-chamber shader, probability
  encoding, texture, shadow, timer or independent motion. Instrument 06 uses
  static battery-flow geometry and the shared coordinator's formation state;
  it adds no separate clock, frame loop or invalidation path. Its annual
  sweep is omitted under reduced motion.

## Increment 06 validation boundary

The fresh release checks pass 135 tests: 4 governance, 11 scientific-core,
11 research-spine, 15 mission-intelligence, 88 visual/model and 6 production
smoke checks. Strict TypeScript, ESLint and all five production build
environments pass. Browser checks confirm that Begin Observation settles into
the observatory, the typed Battery workspace handoff focuses the exact linked
canonical interval, and ArrowRight/Home/End preserve one roving tab stop.
Desktop/mobile pointer rechecks remain in progress. Manual screen-reader
validation and reference-device FPS were not measured; automated checks and
bundle sizes do not establish either.

## Remaining profiling work

- measure production HTML/RSC transfer size after the compact transport;
- record cold-start and warm-request timing in the hosted runtime;
- profile Canvas redraw cost on a mid-range mobile device;
- measure idle GPU activity and reference-device FPS on the target desktop,
  laptop, tablet and mobile hardware;
- exercise real browser context restoration and shader compilation across a
  representative WebGL 2 device matrix;
- consider content-addressed static sample snapshots if edge cold-start CPU becomes material;
- establish performance budgets for provider ingestion, full API serialization and dataset export.


## Sunlit UI release — 2026-10-25

The new controls and scene are separate production chunks. The Sunlit spatial
module is absent from both the controls' static closure and the analytical
shell. It adds 903,123 raw / 239,978 gzip bytes including its shared Three/Fiber
dependencies beyond the control closure; its own module is 21,281 raw / 7,048
gzip bytes. The illustrative cloud image is 196,836 bytes. These are build
measurements, not frame-rate measurements. Previous guided-observatory and
Instrument 05/06 raw bundle ceilings remain unchanged and passing.

The scene owns one demand-rendered frame loop, ends each transition when
settled, pauses when hidden, snaps for reduced motion and caps pixel ratio for
low power. UI controls and exact HTML facts work independently of the WebGL
scene. SVG covers unsupported/context-lost rendering, including zero-capacity
battery cases. Release tests total 144 (4 governance, 11 science, 11 research,
15 mission, 96 visual/data/API, 7 rendered/production smoke). Production CSS
checks guard standard backdrop blur against prefixed-filter minification loss.

Browser checks covered all fourteen workspaces, same-hour handoffs and return,
keyboard controls, dialogs, date loading, and 320/390px layouts. Manual screen
reader and physical-device GPU/FPS measurements remain unmeasured.
