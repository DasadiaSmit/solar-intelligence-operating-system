# ADR 0003: Helios Hero integration boundary

## Status

Accepted.

## Date and accountable department

2026-07-29. Accountable: EXPERIENCE. Review boundaries: ARCH, TWIN, SOLAR,
QA and ACCESSIBILITY.

## Context and constraints

Milestone 2 is the first visible use of the Helios visual-computing foundation.
The production application already contains a complete linked analytical shell,
fourteen workspaces, forecasting, scientific memory and evidence provenance.
The Hero must introduce that operating system without rewriting it, importing
Three.js into its base client module, intercepting native scrolling or implying
that procedural graphics are measurements.

## Decision

1. Build one representative `SceneFrameV1` from the same compact operating
   snapshot used by the analytical shell. The Hero cannot own or mutate the
   linked hour, scenario or result.
2. Keep the Hero and the existing application as separate client boundaries
   beneath a small experience coordinator. The covered application remains
   mounted but inert and hidden from assistive technology until handoff.
3. Keep typography, controls, status, units, provenance and subsystem meaning
   in semantic HTML. The canvas is presentation-only.
4. Load the complete Core/Sun scene through a dynamic boundary below
   `HeliosCanvas`; no Three.js implementation may enter the
   `SolarOperatingSystem` static dependency closure.
5. Read native scroll progress through a passive, animation-frame-coalesced
   observer. Do not cancel wheel, touch or keyboard scrolling.
6. Restrict scroll effects to camera framing and the six Core ring apertures.
   The Hero ends at an empty-observatory handoff and does not reveal an
   instrument.
7. Treat the Core as a system metaphor and the procedural Sun surface,
   corona and magnetic structures as a visual interpretation. Only linked
   direction, irradiance, cloud and quality values may tune the visual state.
8. Use one continuous scene coordinator. Stop continuous motion, pointer
   parallax and particles for reduced motion and while the page is hidden.
9. Keep the semantic fallback visible until a successful rendered frame.
   Forced colours, WebGL2 absence, render failure and context loss remain
   complete HTML experiences.

## Alternatives considered

- Replacing or refactoring the operating shell was rejected because it would
  merge milestones and risk working scientific behavior.
- Building the Hero inside a single monolithic client module was rejected
  because it would pull the spatial dependency graph into the analytical
  workspace bundle.
- Free camera controls and intercepted scroll were rejected because the camera
  explains a fixed relationship and native input must remain accessible.
- A star field, terrain, horizon, module array, Moon or first instrument were
  rejected because none belongs to Milestone 2.
- Texture-based solar imagery was rejected because the visual is procedural
  and must not imply an observed solar image.

## Consequences and risks

The application now has an intentional introductory state and a separate
analytical state. Accessibility depends on correct inert/focus handoff, and
bundle isolation depends on importing the lazy scene directly rather than
through a Three.js barrel. Procedural visuals require explicit disclosure.
Reference-device FPS remains an empirical release follow-up; policy budgets are
not performance claims.

## Verification evidence

Evidence is recorded in `docs/HELIOS_ARCHITECTURE.md`,
`docs/PERFORMANCE.md`, the visual-computing test suite and the production
manifest gate. It includes exact Hero copy, deterministic visual models,
reduced-motion policy, fail-closed scene adaptation, fallback semantics,
static-closure isolation and measured production asset sizes.
