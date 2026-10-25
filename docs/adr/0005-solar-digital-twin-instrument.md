# ADR 0005: Solar Digital Twin Observatory instrument

## Status

Accepted.

## Date and accountable departments

2026-07-29. Accountable: TWIN and EXPERIENCE. Review boundaries: ARCH,
FEATURES, ENERGY, SOLAR, DATA, QA, ACCESSIBILITY and SECOPS.

## Context and constraints

ADR 0004 established one continuous Hero and Observatory with fourteen stable
mounts, one optional WebGL canvas, one frame coordinator and a complete HTML
path. Milestone 4 permits only Instrument 01 at position 01. Positions 02–07
must remain placeholders, positions 08–14 must remain reserved, and the Moon
remains outside scope until Milestone 5.

The linked `SceneFrameV1` supplies a representative one-hour result with sun,
irradiance, weather, configured array orientation, energy, units, lifecycle and
provenance. It explicitly does not supply physical module geometry, terrain, a
surveyed horizon, direct/diffuse browser radiation layers or ground-reflected
irradiance. The existing HTML Solar Digital Twin workspace remains the
authoritative analytical surface.

## Decision

1. Add an immutable renderer-neutral mount registry with exactly one mounted
   instrument: `I01` at position 01. Positions 02–07 remain planned
   placeholders and 08–14 remain reserved. A null instrument key prevents any
   later position from instantiating spatial content accidentally.
2. Project `SceneFrameBuildResult` through a fail-closed
   `SolarDigitalTwinViewV1`. The projection preserves authoritative values,
   timestamp, units, lifecycle and provenance without recalculation. It copies
   all six unavailable-layer records rather than synthesizing replacements.
3. Render Instrument 01 as a compact, texture-free logical topology:
   configured collection orientation, conversion, distribution, demand,
   storage and grid interfaces. Geometry size and conduit appearance do not
   encode module count, site layout or energy magnitude. The representation is
   disclosed as a configured-orientation schematic, never a surveyed replica.
4. Keep `ObservatorySceneManager` as the only `useFrame` owner. Instrument
   formation is a pure function of continuous dial position and is applied
   through an imperative presentation handle. Instrument modules own no timer,
   frame loop, scroll observer, pointer interaction or invalidation request.
5. Keep all exact facts, lifecycle, provenance, limitations and actions in
   semantic HTML. The WebGL canvas remains pointer-inert and optional.
   Forced-colour, reduced-motion, WebGL-unavailable and context-loss paths
   retain the same information and Digital Twin action.
6. Add a typed application activation request at the composition boundary.
   Only mounted Instrument 01 can request workspace `DT` and the linked
   representative-hour index. The analytical shell applies this request after
   device preferences load, then acknowledges it before focus moves to
   `#primary-stage`; a saved workspace cannot override an explicit
   Instrument 01 request.
7. Preserve the existing lazy spatial boundary, demand renderer and adaptive
   quality tiers. Low-capability devices always receive the scientific tier.
   No dependency, texture, secondary canvas, particle system or new runtime
   service is introduced.

## Alternatives considered

- A physical panel field, ground surface or terrain mesh was rejected because
  no versioned geometry or survey evidence exists.
- Encoding instantaneous energy as moving particles was rejected because
  direction and magnitude would be easy to overstate and would require
  continuous rendering.
- WebGL hover tooltips were rejected because they would make scientific facts
  and interaction depend on pointer input and renderer availability.
- Reimplementing the Digital Twin analytical workspace in Three.js was
  rejected because charts, controls, evidence and reports belong in HTML and
  already exist.
- Allowing the generic Observatory completion path to choose a workspace was
  retained for placeholder positions; only explicit Instrument 01 activation
  is allowed to target `DT`.

## Consequences and risks

Instrument 01 now teaches the system topology while the analytical workspace
continues to supply detailed engineering evidence. The scene is intentionally
less literal than a physical digital replica. This protects scientific
integrity but requires the HTML disclosure to remain visible whenever the
instrument is selected.

The activation request adds coordination between two already mounted layers.
Focus must wait for the requested workspace and linked index to be applied.
Regression tests therefore lock the request target, saved-view override order
and acknowledgement boundary.

Primitive geometry adds to the existing lazy spatial closure. Production
manifest budgets remain hard release gates, while actual FPS, GPU memory and
assistive-technology behavior still require measured device/browser evidence
before being claimed.

## Verification

The release gates cover:

- one mounted, six placeholder and seven reserved registry entries;
- deterministic, finite and immutable formation state;
- exact linked fact, unit, lifecycle, provider/version and evidence-reference
  preservation;
- explicit failure for unavailable or inconsistent scene frames;
- absence of physical layout, terrain, surveyed horizon, DNI/DHI, reflected
  radiation and lunar synthesis;
- one frame owner and no OrbitControls, randomness, wall-clock animation,
  secondary canvas or instrument-local invalidation;
- semantic position wording, reduced-motion and forced-colour paths;
- Instrument 01-only activation of `DT` at the representative-hour index;
- strict TypeScript, lint, science/research/Mission Intelligence tests,
  production build, smoke tests and lazy-bundle ceilings.

## Successor boundary

The next Milestone 4 increment may integrate Instrument 02 only after its own
scientific, HTML-fallback, performance and workspace-handoff contracts are
accepted. Instrument 01 must remain backward compatible. The Moon and lunar
state remain prohibited until Milestone 5.
