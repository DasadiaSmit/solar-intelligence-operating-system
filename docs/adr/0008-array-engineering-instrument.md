# ADR 0008: Solar Array Engineering Observatory instrument

## Status

Accepted. Increment 04 release gates passed on 2026-07-29.

## Date and accountable departments

2026-07-29. Accountable: SOLAR, TWIN and EXPERIENCE. Review boundaries: ARCH,
FEATURES, ENERGY, DATA, QA, ACCESSIBILITY and SECOPS.

## Context and constraints

ADR 0007 mounted Annual Energy Observatory at position 03 while preserving one
canvas, one frame owner, three earlier instruments and the unchanged analytical
application. Milestone 4 Increment 04 may add only Solar Array Engineering at
position 04. Instruments 01–03 must remain formed at subdued emphasis,
positions 05–07 must remain placeholders, positions 08–14 must remain reserved,
and the Moon remains outside scope until Milestone 5.

The source brief asks users to adjust tilt, azimuth, module count, inverter,
efficiency and losses while the Sun path, shadows and projected production
respond. The existing application does not support all of those claims:

- the HTML scenario branch supports DC capacity, tilt, azimuth and one
  aggregate system-loss screening input;
- its projected production is a bounded client-side orientation and scaling
  proxy, not an authoritative STAR Engine rerun or bankable design result;
- the canonical configuration contains a generic DC/AC ratio and nominal
  inverter efficiency, but no named inverter, equipment count or manufacturer
  curve;
- no module STC rating or conversion-efficiency field exists, so module count
  and module efficiency cannot be inferred;
- no module dimensions, row spacing, placement, ground clearance, terrain,
  surveyed horizon or obstruction geometry exists, so physical moving shadows
  cannot be calculated; and
- changing an array configuration cannot change the astronomical Sun path for
  a fixed site and time. It changes array orientation and optical incidence
  relative to that path.

Scientific integrity therefore requires an engineering evidence instrument and
an explicit handoff to the existing HTML screening controls, not a fabricated
editable solar farm.

## Decision

1. Add renderer-neutral `ArrayEngineeringFrameV1` at schema version `1.0.0`.
   Build it server-side from the full canonical `OperatingSnapshot`, before
   compact browser projection, at the same result ID and representative-hour
   index as the existing Observatory.
2. Preserve the exact configured array inputs, configured loss inputs,
   authoritative linked-hour Sun and ENU direction, resolved array
   orientation, angle of incidence, incidence modifier, weather, irradiance,
   DC/AC conversion, loss factors, quality, annual summary, annual loss chain,
   lifecycle and provenance. The view adapter may validate, clone and freeze
   these values but may not recompute the scientific result.
3. Encode `arrayConfigurationAffectsSunPath: false`. Array settings may rotate
   the normalized aperture relative to the authoritative Sun vector; they may
   never move or rewrite astronomical state.
4. Describe the existing DC-capacity, tilt, azimuth and aggregate-loss controls
   as `SIMULATED` screening controls. They remain HTML, preserve device-local
   branches and require authoritative server recalculation before engineering
   reliance. No scenario patch is transmitted from the Observatory.
5. Keep configured tracking, panel technology, DC/AC ratio, bifaciality,
   temperature coefficient, degradation, system age and nominal generic
   inverter efficiency as read-only canonical facts in this increment.
6. Carry explicit unavailable layers for module count/rating, physical module
   and row geometry, named inverter selection/curve, module efficiency,
   editable inverter efficiency, physical shadow/terrain/horizon fields,
   candidate hourly production, measured/live plant output and authoritative
   client-side recalculation. The renderer and HTML presentation may not
   synthesize any of them.
7. Mount `I04` at position 04 with the key `solar-array-engineering`. The
   immutable registry therefore contains four mounted instruments, three
   navigable placeholders and seven reserved positions. Instruments 01–03
   remain formed and visible at reduced emphasis when Instrument 04 is active.
8. Render one normalized, explicitly nonphysical collection aperture with its
   resolved normal, the authoritative linked Sun vector and the source angle
   of incidence relationship. Capacity must not alter physical area. Do not
   render module rows, terrain, a ground plane, cast or received shadows,
   obstruction geometry, textures or decorative particles.
9. Keep `ObservatorySceneManager` as the sole `useFrame` owner in the existing
   demand-rendered canvas. Instrument 04 owns no frame loop, timer, random
   source, invalidation path, camera owner, control system, texture, shadow map
   or second canvas. Reduced motion remains an upstream stable-pose policy.
10. Keep exact facts, editability boundaries, generic-model language,
    provenance, unsupported layers and the user action in semantic HTML. The
    mounted instrument issues a typed `AE` activation request at the exact
    linked index, opens the existing Scenario controls without replacing a
    restored branch, and focuses the existing first engineering control only
    after application state acknowledges the request.

## Alternatives considered

- Treating DC capacity as module count was rejected because module STC rating
  and physical dimensions are unavailable.
- Adding an inverter picker was rejected because no named equipment registry,
  curve or validated selection calculation exists.
- Labelling nominal inverter efficiency as module efficiency was rejected
  because they are different physical quantities.
- Moving the Sun when tilt or azimuth changes was rejected because array
  configuration cannot alter astronomical geometry.
- Enabling generic WebGL shadows was rejected because unproven geometry would
  create a convincing but scientifically false shading claim.
- Reusing the client screening proxy as the Observatory's scientific source
  was rejected because it is explicitly non-bankable and does not rerun the
  canonical hourly physics chain.
- Moving sliders, reports or response surfaces into WebGL was rejected because
  controls, exact values and accessible comparison remain HTML
  responsibilities.
- Removing or replacing Instruments 01–03 was rejected because the
  Observatory is one persistent scientific environment.

## Consequences and risks

The instrument teaches the relationship among authoritative Sun position,
resolved aperture orientation and optical incidence without claiming a
surveyed plant. It deliberately exposes fewer editable quantities than the
aspirational brief because every omitted quantity lacks an executable,
versioned scientific source.

The existing Array Engineering workspace still provides useful rapid
screening, but its local production response must remain visibly `SIMULATED`,
non-bankable and subject to authoritative recalculation. Opening its controls
must not reset a saved device-local branch.

The normalized aperture is a coordinate instrument, not a module, string, row
or scale model. Visual precision must not be mistaken for surveyed geometry.
Reference-device FPS, assistive-technology acceptance and physical-device
performance remain separate evidence until measured.

## Verification

The Increment 04 release gates must cover:

- four mounted, three placeholder and seven reserved registry entries;
- exact configured/resolved array, linked-hour physics, annual/loss-chain and
  provenance preservation from the canonical snapshot;
- valid ENU direction and angle-of-incidence relationships without Sun-path
  mutation;
- fail-closed malformed time, configuration, physical values, reconciliation
  and provenance;
- explicit unsupported module, inverter, efficiency, shadow, geometry,
  measured-output and client-recalculation layers;
- one normalized aperture, no capacity-as-area encoding, no WebGL text/chart/
  form controls and no physical-shadow claim;
- persistence at reduced emphasis of Instruments 01–03;
- one canvas, one `useFrame` owner, no local time/randomness/invalidation and
  unchanged demand-idle/adaptive-DPR behavior;
- semantic HTML parity, keyboard and reduced-motion operation, a typed exact
  `AE` handoff and preserved device-local scenario state;
- strict TypeScript, lint, focused model tests, complete visual tests, a fresh
  production build, smoke tests and unchanged production-manifest ceilings.

Recorded release evidence: the focused Array Engineering model suite passes
7/7; the complete visual/Observatory suite passes 52/52; the full repository
suite passes 97/97 including a fresh production build and 5/5 smoke tests.
Strict TypeScript, ESLint and `git diff --check` pass. The production manifest
reports a 154,572-byte analytical shell, 349,669-byte continuous scene,
1,262,174-byte incremental spatial closure and 1,452,675-byte complete spatial
closure, beneath the unchanged 1,265,000-byte and 1,465,000-byte raw ceilings.
Browser/assistive-technology acceptance and reference-device FPS remain
separate unclaimed evidence.

## Successor boundary

Instrument 05 may begin only after this decision is accepted with recorded
release evidence and a private deployment. It may not replace Instruments
01–04, weaken their versioned evidence boundaries, move analytical controls
into WebGL or introduce the Moon before Milestone 5.
