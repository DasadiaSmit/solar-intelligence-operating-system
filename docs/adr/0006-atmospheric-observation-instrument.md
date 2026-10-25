# ADR 0006: Atmospheric Observation Observatory instrument

## Status

Accepted.

## Date and accountable departments

2026-07-29. Accountable: TWIN and EXPERIENCE. Review boundaries: ARCH,
FEATURES, SOLAR, DATA, QA, ACCESSIBILITY and SECOPS.

## Context and constraints

ADR 0005 mounted the Solar Digital Twin at Observatory position 01 without
replacing the analytical application, changing `SceneFrameV1` or adding a
second canvas or frame loop. Milestone 4 Increment 02 may add only the
Atmospheric Observation instrument at position 02. Instrument 01 must remain
visible in a subdued state as Instrument 02 forms; positions 03–07 remain
placeholders, positions 08–14 remain reserved, and the Moon remains outside
scope until Milestone 5.

The canonical `OperatingSnapshot` contains one-hour cloud cover, relative
humidity, wind speed, ambient temperature, GHI, DNI, DHI, effective
plane-of-array irradiance and modelled AC energy at the representative linked
hour. The compact `sios-hour-tuple-v1` browser transport intentionally omits
some of those fields. Neither source contains wind direction, attributed
cloud altitude or type, measured three-dimensional cloud geometry, cloud
motion, sub-hour response, or measured/live plant output.

The sample application lifecycle is `SIMULATED`. Weather, irradiance and
modelled AC energy are coincident values for the same one-hour interval. Their
co-variation is not evidence that a displayed cloud state caused an instant
power response.

## Decision

1. Add the immutable, renderer-neutral
   `AtmosphericObservationFrameV1` contract at schema version `1.0.0`. Build
   exactly one representative-hour frame on the server from the full canonical
   `OperatingSnapshot`, before annual browser compaction, using the same result
   ID and linked index as the Hero scene. Preserve the existing
   `SceneFrameV1` and 14-value `sios-hour-tuple-v1` unchanged.
2. Preserve the exact timestamp, 3,600-second interval, lifecycle, weather,
   irradiance, modelled AC energy, configured DC capacity, quality,
   completeness, imputation state, flags, units, provider, dataset version,
   calculation version and evidence-reference IDs. Mark the relationship as
   `coincident-one-hour-interval` with `causalityClaim: false`.
3. Carry seven explicit unavailable layers: wind direction, cloud altitude,
   cloud type, cloud geometry, cloud motion, sub-hour response and measured or
   live plant output. Weather fields must remain inside the canonical provider
   `FIELD_BOUNDS`; effective POA has a separate conservative 4,200 W/m²
   transposition-output ceiling; one-hour modelled AC energy may not exceed
   configured DC capacity. Invalid values, interval semantics, lifecycle,
   result identity or provenance fail closed; the renderer may not synthesize
   a replacement. The POA guard is a scientific contract, not the spatial
   display scale.
4. Mount `I02` at position 02 with the key `atmospheric-observation`. The
   registry therefore contains two mounted instruments, five navigable
   placeholders and seven reserved positions. Instrument 01 remains formed and
   visible at reduced emphasis when position 02 becomes active.
5. Render Instrument 02 as a static, texture-free one-hour atmospheric transfer
   schematic. Supplied magnitudes may control bounded presentation channels,
   but no geometry or opacity represents measured cloud altitude, shape or
   motion, a vertical atmospheric profile or wind direction. The one-hour AC
   response is a coincident interval fact, not a causal animation.
6. Keep `ObservatorySceneManager` as the only `useFrame` owner. The existing
   demand renderer wakes for camera, dial and fine-pointer transitions and
   sleeps when they settle. Instrument 02 owns no timer, frame loop,
   invalidation path, random particle source, dependency or texture.
7. Keep every exact fact, lifecycle, quality field, provenance record,
   unavailable layer and action in semantic HTML. WebGL remains pointer-inert
   and optional; forced-colour, reduced-motion, unavailable-WebGL and
   context-loss modes preserve the same scientific meaning.
8. Let mounted Instrument 02 issue a typed activation request for the existing
   Weather and Atmosphere workspace `WA` at the exact linked index.
   Device-local preferences are applied first, the explicit request then wins,
   and it is acknowledged before focus moves to the primary analytical stage.
   Instrument 01 retains its existing `DT` target.
9. Use the existing continuous camera system to rise and reframe the
   atmospheric schematic. The camera motion teaches the change in observational
   layer; it does not imply altitude measurement or free user navigation.

## Alternatives considered

- Extending the 8,760-row compact tuple with humidity, wind speed, DNI and DHI
  was rejected because Instrument 02 needs one bounded representative frame,
  not a permanent annual client-payload or public transport change.
- Moving cloud meshes, advection particles or an “instant” output animation
  were rejected because cloud motion, wind direction, sub-hour data and a
  causal response model are unavailable, and continuous motion would defeat
  demand-render idle behavior.
- Deriving wind direction, cloud class, altitude or three-dimensional cloud
  shapes from the available scalar values was rejected because those would be
  invented scientific layers.
- Replacing or recreating the Weather and Atmosphere workspace in WebGL was
  rejected because detailed facts, charts, controls and reports remain the
  responsibility of accessible HTML.
- Removing Instrument 01 while Instrument 02 forms was rejected because the
  Observatory is a continuous instrument system; the predecessor remains
  visible with deliberately lower emphasis.

## Consequences and risks

The server now supplies one additional bounded frame alongside the compact
annual scene payload. This preserves exact canonical DNI/DHI and weather facts
without changing the long-lived browser tuple, but both frames must continue
to share the same result identity and linked representative hour.

The name “Atmospheric Observation” can sound like measured or live telemetry.
The `SIMULATED` lifecycle, exact provenance and unavailable measured/live
output disclosure must therefore remain visible wherever the instrument is
selected.

The static spatial encoding explains a coincident atmospheric-to-energy
transfer context without visualising unsupported motion or causality. It
cannot answer questions about cloud trajectory, ramp rate, local shadow
passage or plant response below the one-hour interval.

Increment 02 adds primitive geometry to the existing lazy spatial closure.
The measured 1,233,683-byte incremental and 1,424,184-byte complete spatial
closures remain beneath their established hard ceilings. Those asset sizes do
not establish reference-device FPS, GPU memory, idle activity or
assistive-technology behavior; those claims still require measured evidence.

## Verification

The Increment 02 release gates must cover:

- two mounted, five placeholder and seven reserved registry entries;
- exact representative-hour identity, timestamp, interval, lifecycle, values,
  units, quality and provenance preservation from the canonical snapshot;
- a coincident temporal relationship with no causal, instant, measured or
  live-output claim;
- explicit unavailability of wind direction, cloud altitude/type/geometry/
  motion, sub-hour response and measured/live plant output;
- fail-closed rejection of malformed values, finite provider-bound violations,
  POA above 4,200 W/m², one-hour AC above configured DC capacity, provenance,
  lifecycle or interval semantics;
- persistence and reduced emphasis of Instrument 01 while Instrument 02 forms;
- one canvas, one frame owner, demand-render idle behavior and no instrument
  timer, local invalidation, randomness, particle stream, texture or new
  dependency;
- semantic HTML parity under reduced motion, forced colours, unavailable
  WebGL and renderer failure;
- Instrument 02 activation of `WA` at the exact linked index while Instrument
  01 retains `DT`;
- strict TypeScript, lint, scientific/research/Mission Intelligence tests,
  focused visual contracts, production build, smoke tests and manifest
  ceilings.

The measured Increment 02 manifest figures and fresh full-gate command counts
are recorded in the release ledger.

## Successor boundary

The next Milestone 4 increment may integrate Instrument 03 only after its own
scientific, accessibility, performance and workspace-handoff contracts are
accepted. Instruments 01 and 02, both versioned frame boundaries and both
typed handoffs must remain backward compatible. The Moon and lunar state
remain prohibited until Milestone 5.
