# ADR 0004: Continuous Observatory framework

## Status

Accepted.

## Date and accountable department

2026-07-29. Accountable: TWIN. Review boundaries: EXPERIENCE, ARCH, FEATURES,
SOLAR, QA and ACCESSIBILITY.

## Context and constraints

Milestone 2 established one accessible Hero above the existing analytical
application. Its Helios Core, procedural Sun, guided camera, renderer policy,
scientific HTML and failure boundary are already production foundations.
Milestone 3 must continue that environment into an Observatory navigation
framework without starting Instrument 01, mapping structural positions to
existing workspaces or changing any scientific behavior.

The production application still contains fourteen complete analytical
workspaces with linked time, scenario, forecast, evidence, provenance and
scientific-memory state. Those capabilities cannot be rewritten or duplicated
inside the Observatory. WebGL remains presentation-only, optional and isolated
from the analytical shell's static dependency closure.

## Decision

1. Represent the experience as three explicit phases: `hero`, `observatory` and
   `application`. Hero and Observatory share one continuous journey; the
   existing application remains mounted but inert and hidden from assistive
   technology until the application phase. Focus moves deliberately from entry
   controls to Observatory navigation and then to `#primary-stage`.
2. Retain one persistent `HeliosCanvas` across the Hero and Observatory phases.
   The canvas keeps its existing lazy renderer, required semantic fallback,
   WebGL 2 failure containment and one-retry policy. It is not duplicated at
   the phase boundary.
3. Keep `HeliosHeroScene` as the stable lazy proxy and delegate composition to
   one `ObservatorySceneManager`. That manager is the sole React Three Fiber
   `useFrame` owner for the Core, Sun, field loops, structural dial and camera.
   Lighting and environment remain separate reusable systems.
4. Use a separate `ObservatoryCameraController` with one paused GSAP timeline
   for the Hero and immutable, pure Observatory camera anchors afterward.
   Native scroll progress scrubs presentation state. The camera is
   cinematographic: no OrbitControls, free rotation, bounce, teleport,
   ScrollTrigger or independent animation loop is permitted.
5. Derive progress from the existing native scroll region with a passive,
   animation-frame-coalesced observer. Wheel, touch and keyboard scrolling are
   never cancelled, and no scroll snapping is introduced. Direct navigation
   requests the corresponding native scroll position rather than mutating a
   private camera state.
6. Establish one renderer-neutral, immutable fourteen-position registry. The
   positions are equally spaced at `2π / 14` around a calibrated dial.
   Positions 01–07 are navigable placeholders named Solar Digital Twin,
   Atmospheric Observation, Annual Energy Observatory, Solar Array
   Engineering, Scenario Simulator, Battery & Energy Flow, and Regional Solar
   Intelligence. Positions 08–14 are generic reserved positions.
7. Treat all fourteen positions as structural metadata only. The current
   position aligns to the fixed top datum; prior positions remain visible but
   subdued, future navigable positions retain minimal glow, and reserved
   positions remain dim. Empty scene groups provide stable future composition
   anchors but contain no instrument or scientific geometry.
8. Keep navigation, position names, availability, instructions, current state
   and the framework limitation in semantic HTML. The HTML dial provides the
   clickable and keyboard-operable controls; the WebGL dial is
   presentation-only and cannot receive pointer input. The readout states that
   no scientific instrument is mounted in this milestone.
9. Reduced motion bypasses smooth scrolling and camera inertia by selecting the
   requested presentation state directly. All seven available positions,
   reserved-position meaning and entry to the existing application remain
   available without animation or WebGL.
10. Continue to use the existing `SceneFrameV1` solely for the linked Core/Sun
    context. The Observatory registry and state contain no workspace, linked
    time, scenario, forecast, evidence, provider or scientific-memory state.
    The fourteen analytical workspaces, calculations, APIs, forecasting,
    validation and provenance remain unchanged.
11. End Milestone 3 before instrument formation. It introduces no Instrument
    01 mesh, Digital Twin geometry, module array, terrain, horizon, Moon,
    lunar state, analytical workspace redesign or new scientific value.

## Alternatives considered

- Mounting a second Observatory canvas after the Hero was rejected because it
  would duplicate a GPU context, flash the fallback during handoff and break
  the visual identity of the persistent Core.
- Reusing the existing workspace registry as the spatial dial was rejected
  because structural instrument positions and analytical workspaces are
  different contracts. Joining them now would merge Milestones 3 and 4.
- Enabling pointer selection inside Three.js was rejected because it would make
  WebGL an interaction dependency and weaken keyboard, screen-reader,
  forced-colour and renderer-failure equivalence.
- OrbitControls, ScrollTrigger, wheel interception, scroll snapping and
  carousel-style navigation were rejected because the calibrated camera and
  dial explain a fixed sequence through native input.
- Forming Instrument 01, a Solar Digital Twin scene, terrain, array geometry or
  the Moon was rejected because those capabilities require later milestone
  contracts and authoritative data that Milestone 3 does not provide.

## Consequences and risks

The Hero and Observatory now share one spatial runtime and one visual state
continuum. This prevents a scene reset and preserves the renderer fallback, but
it makes phase, inert-state and focus management release-critical. A regression
could expose two semantic layers simultaneously or allow application shortcuts
to fire beneath the Observatory.

The seven named positions may resemble available instruments even though they
are only mounts. Every representation must therefore preserve the
`navigable-placeholder` or `reserved` status and the explicit no-instrument
disclosure. Future milestones must add capability behind the registry rather
than silently promoting its current structure.

One frame coordinator reduces competing animation and lifecycle risk. Normal
motion wakes demand rendering only while camera progress or fine-pointer
response is unsettled; idle, hidden and reduced-motion states do not maintain a
continuous GPU loop. Adaptive DPR and source budgets still are not frame-rate
evidence, so measured reference-device profiling remains required.

No scientific result, API, database record, saved view or analytical workspace
requires migration. The existing application remains the complete
non-WebGL-capable decision-support surface.

## Migration and rollback

This decision is additive and requires no data, API, persistence or scientific
contract migration. `SceneFrameV1` and the compact operating snapshot remain
compatible.

A source rollback removes the Observatory registry, motion model, managers,
structural dial, semantic navigation and their tests together, then restores
the Milestone 2 Hero scene coordinator and direct application handoff. Because
the analytical application stays mounted and unchanged, rollback does not
alter its state schema, calculations, routes or stored device-local records.

## Verification evidence

`tests/observatory-framework.test.mjs` provides focused executable evidence for:

- exactly fourteen immutable, equally spaced positions with seven navigable
  placeholders and seven reserved mounts;
- calibrated top alignment, direct-navigation bounds, marker-state order and
  finite/clamped presentation state;
- exact continuity from the Milestone 2 Hero camera endpoint, finite camera
  interpolation and no discontinuity at the entry or handoff boundaries;
- one Observatory `useFrame` owner, passive native scrolling and absence of
  OrbitControls, randomness, wall-clock animation, ScrollTrigger and scroll
  snapping;
- fourteen empty spatial anchors and no Instrument 01, Moon, terrain, horizon
  or module geometry;
- keyboard/roving navigation, reserved-position semantics, settled-only live
  status, reduced-motion direct selection, forced-colour support and
  presentation-only WebGL.

The focused Observatory suite passed 11/11 after implementation. Strict
TypeScript, lint, the complete scientific and application test suites,
production build, lazy-manifest closure, renderer fallback and dependency
security remain mandatory release gates. Browser, assistive-technology and
reference-device FPS evidence must be reported only when those sessions are
actually performed.

## Successor boundary

Milestone 4 may form Instrument 01—the Solar Digital Twin—at position 01 only
after its scientific, accessibility, fallback and performance contracts are
accepted. It must consume the existing Observatory registry and scene/state
boundaries rather than replace them. Positions without implemented
instruments remain placeholders, the existing analytical workspaces remain
authoritative, and the Moon remains prohibited until Milestone 5.
