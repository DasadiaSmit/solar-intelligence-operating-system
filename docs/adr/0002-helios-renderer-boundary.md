# ADR 0002: Helios renderer and scene-frame boundary

## Status

Accepted.

## Date and accountable department

2026-07-29. Accountable: TWIN. Review boundaries: ARCH, EXPERIENCE, SOLAR and
QA.

## Context and constraints

The existing observatory is a working HTML, CSS and event-driven 2D Canvas
application over tested scientific state. Prompt milestone ordering requires a
visual foundation before the Hero and prohibits route or workspace integration
during Milestone 1. The repository also requires WebGL to remain optional,
screen-reader meaning to remain HTML, rendering to sleep while idle and
scientific calculations to remain untouched.

The compact browser transport already contains authoritative linked-hour solar
position, irradiance, weather, interval energy and quality. It does not contain
surveyed terrain, horizon, physical module geometry, lunar state or the
individual direct/diffuse/reflected radiation layers needed to claim those
visuals as real.

## Decision

1. Implement `SceneFrameV1` as a pure renderer-neutral contract before any
   visible Three.js scene.
2. Represent the scientific frame as named east, north and up components, with
   azimuth clockwise from true north. The rendering adapter maps ENU to Three.js
   as `x = east`, `y = up`, `z = -north`.
3. Preserve the one-hour browser transport as interval energy in `kWh/1h`.
4. Carry timestamp, lifecycle, units, quality and provenance into every frame.
   Missing geometry or radiation layers remain explicit unavailable values.
5. Fail closed before producing scene coordinates when critical values are
   invalid.
6. Keep `HeliosCanvas` as a lightweight SSR-safe host that lazily imports the
   React Three Fiber renderer. Require an HTML fallback from every caller.
7. Use demand rendering, adaptive DPR capped below the global ceiling,
   page-visibility suspension, a renderer-local error boundary and WebGL
   context-loss fallback.
8. Keep camera, lighting, environment and deterministic semantic particles as
   separate composable systems. Do not add OrbitControls, random particles,
   continuous loops, postprocessing or a visible Helios Core in Milestone 1.
9. Do not connect the foundation to any production route or workspace until
   Milestone 2.

## Alternatives considered

- Binding Three.js meshes directly to `HourDatum` was rejected because it would
  couple rendering to UI normalization and bypass the planned scene contract.
- Mounting a decorative prototype during Milestone 1 was rejected because it
  would merge milestones and ship visual claims before their fallback and
  provenance boundaries existed.
- Static Three.js imports in the operating shell were rejected because they
  would consume the established base-shell budget before a visible feature
  exists.
- A continuously rendered canvas was rejected because unchanged scientific
  state requires no GPU work.
- Random or seeded ambient particles were rejected because no current
  scientific pathway assigns them meaning.
- Free OrbitControls were rejected because camera behavior is explanatory and
  cinematographic, not exploratory spinning.

## Consequences and risks

Milestone 1 produces no visible user-facing change. It adds a deliberate
foundation that can be composed safely in Milestone 2. The additional
dependencies remain absent from the current production route because no route
imports the lazy host.

The quality tiers are complexity budgets, not measured FPS guarantees.
Reference-device performance and visual acceptance cannot be completed until a
visible scene exists. Future integrations must not reinterpret the unavailable
fields or let the fallback drift from the WebGL state.

## Migration and rollback

Milestone 2 will import `HeliosCanvas` through the existing Hero boundary and
provide an HTML fallback over `SceneFrameV1`. No scientific/API migration is
required. Rollback removes the unconnected `components/3d`,
`features/visual-computing` and focused tests together; the existing production
observatory remains unchanged throughout.

## Verification evidence

- ENU north, east and zenith reference vectors.
- Sun-angle round-trip parity within the TWIN 0.25-degree tolerance.
- Timestamp, interval units, lifecycle, quality and provenance preservation.
- Explicit-unavailable geometry and radiation layers.
- Fail-closed invalid solar input.
- Bounded demand-render policy for page visibility, reduced motion, forced
  colours, context loss, DPR and quality tiers.
- Deterministic semantic-particle selection with no random generation.
- Semantic HTML fallback with no canvas dependency.
- Strict TypeScript, lint and peer-dependency checks: passed.
- Governance, scientific, research, Mission Intelligence, visual-computing and
  release-smoke suites: passed, 53/53.
- Five-environment Vinext production build and all eight application/API
  routes: passed.
- The production `SolarOperatingSystem` asset remains 164,215 bytes and the
  complete production output contains no Three.js, React Three Fiber,
  OrbitControls or Helios renderer code because Milestone 1 is unconnected.
- Whole-lockfile high/critical audit gate: passed under the exact documented
  development-tool exception; the production dependency audit reports no known
  vulnerabilities.
