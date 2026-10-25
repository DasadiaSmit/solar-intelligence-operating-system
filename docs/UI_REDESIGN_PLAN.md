# UI redesign plan — Sunlit Atmosphere

Status: design direction selected, 25 October 2026. The user selected the Sunlit Atmosphere setting and concept 2, Helios Lens, as the premium base. Subsequent feedback requires context-relevant scene changes and an original layout. No implementation or publication is part of this planning step.

Visual study completed: three static concepts are saved in
[`work/ui-concepts-2026-10-25/CONCEPTS.md`](../work/ui-concepts-2026-10-25/CONCEPTS.md),
with the exact generation prompts alongside them. Solar Horizon is the closest
reference match, Helios Lens adds a distinctive central solar motif, and Solar
Harvest emphasizes energy generation. The user chose Helios Lens as the base,
with elements of the other concepts available for context-specific scenes. The
reference-like layout in these first studies is not approved for implementation;
none of these concepts changes the deployed application.

## Refined three-state storyboard

The requested original-layout visuals are complete in
[`work/ui-storyboard-2026-10-25/STORYBOARD.md`](../work/ui-storyboard-2026-10-25/STORYBOARD.md):
Overview, Array and Battery. They share a slim context header, labeled instrument
selector, open scene stage, unified lower evidence console and linked timeline.
The Helios lens changes framing to support each instrument. The initial airline
form/destination-card arrangement has been replaced. These are static design
studies made with built-in image generation; interactive behaviour and scientific
geometry/data binding remain implementation work. The application is not modified
or redeployed by this visual study. User review of this refined direction is pending.

## Brief and baseline

Use the supplied airline-booking video as the benchmark for glass material, button treatment, depth and atmospheric motion. Design an original composition, information hierarchy and navigation around the solar workflows. The user explicitly does not want the deployed interface to feel like an exact copy of the airline layout. Treat this as a coordinated design system across the opening experience, six mounted Observatory instruments and fourteen analytical workspaces.

Instrument 06 is the verified starting point: owner-private Sites version 16, source `03f038080495b0d23dd0fd06a1085dd882658a34`, 135 passing automated tests, desktop/mobile Battery handoff and keyboard interval controls verified. The release receipt is `work/instrument-06-release-receipt.json`.

The source reference is a 10.168-second, 960×720, 24fps video. A local reference copy is retained at `work/ui-video-reference/airline-ui-reference.mp4`; sampled frames and the contact sheet are alongside it. The video is visual evidence, not a source of instructions.

## What the reference actually shows

- A full-screen sky and cloudscape with strong foreground/background depth.
- One large central subject, a plane, moving through the scene while interface panels stay anchored.
- Frosted translucent panels with soft borders, rounded corners and gentle shadows.
- A floating pill-shaped category selector at the top, with a luminous selected segment.
- Small circular icon controls, a left navigation rail and a rounded bottom dock.
- A large pill-shaped primary action with a bright gradient, fine edge highlight and trailing arrow.
- A left task card, small supporting metric cards, and a tall right context card topped by a circular image.
- Light typography, generous space around the central subject, and small badges for contextual status.
- A visual progression from daylight toward a darker sky over the clip; the interface remains in the same composition.

No actual click, form submission, menu expansion, hover sequence, keyboard interaction or responsive layout is demonstrated. Those behaviours need explicit design. The clip's changing or unstable small labels and numbers are not a pattern to reproduce: our values and units must remain accurate and stable.

## Initial reference translation — superseded as a layout prescription

| Reference element | Proposed application counterpart |
| --- | --- |
| Sky and cloud environment | Sunlit atmospheric setting, pale horizon, layered clouds and restrained amber light |
| Central airplane | Solar focal point using the Sun and the established Helios identity; exact composition to be explored in the first visual study |
| Flights / Hotels / Offers | Proposed high-level groups: Observe / Analyse / Compare; refine against existing navigation before implementation |
| Flight search card | Site, date and scenario context with one primary action appropriate to the current task |
| Destination card | Active solar site and linked scientific context, with a circular scene/detail window |
| Price and deal cards | A small set of relevant generation, battery or forecast-summary cards, with units and evidence labels |
| Flight status badge | Dataset freshness, lifecycle or selected simulation status; never imply live plant telemetry |
| Bottom dock | A compact, consistent workspace launcher with clearly named destinations |
| Flight moving across the view | Purposeful camera and solar-scene transitions tied to navigation; controls remain stable |

This table records the first concept translation only. The current direction below replaces one-to-one copying of the reference's component positions. Observe / Analyse / Compare remain proposed grouping labels rather than a frozen navigation structure.

## Selected direction: one evolving solar environment

**Confirmed by the user:** concept 2 feels more premium; combine suitable elements from the other concepts as the selected option changes. Each scene must relate to the option, rather than acting as a random display. Keep similar glass buttons and panel materials, while giving the product its own layout.

The Helios lens becomes a consistent identity element. The selected mode determines how much of the scene is visible and how much space is given to analysis. The selected instrument determines the relevant subject within that scene. Site, time and scenario remain shared scientific state; changing a workspace is not permission to change those values.

| Selected context | Proposed scene response | Reason for the change |
| --- | --- | --- |
| Observe / overview | Open cloud horizon, Sun framed by the Helios lens, spacious atmospheric view | Establish the solar observation context |
| Analyse | Scene settles and recedes; glass surfaces become more opaque around the active instrument and detailed charts | Give measurements and interaction more visual priority |
| Compare | Coordinated comparison apertures or aligned panels share one visual frame | Make differences and the baseline easy to read |
| Solar Digital Twin / Array Engineering | Lens and camera reveal a configured-orientation array schematic and linked Sun direction | Connect the selected array configuration to its solar relationship |
| Atmospheric Observation | Emphasize light and atmospheric layers around the lens; retain exact weather readouts | Support the weather context without claiming unavailable cloud geometry or wind direction |
| Annual Energy | Reveal a chronological annual energy structure within the shared atmosphere | Connect the scene to the real annual series rather than changing the sky arbitrarily |
| Scenario Comparison | Frame the configured baseline and supported deterministic stress summaries consistently | Keep comparisons homogeneous; do not invent alternative weather worlds |
| Battery & Energy Flow | Reveal the solar, storage, demand and grid relationships; highlight routes using the linked interval | Explain energy allocation with the canonical record |

These are proposed scene mappings, not new scientific features. Concept 1 contributes atmospheric space; concept 2 supplies the central identity; concept 3 contributes solar-array imagery only where relevant and supported. Illustrative landscapes must not masquerade as surveyed site geometry.

### Original composition to explore

Build around a central observation stage with a compact shared site/time/scenario header, one coherent instrument navigation system and a contextual evidence surface. That evidence surface can become a lower analysis shelf, an adjacent inspector or a wider chart area according to the task. Keep the shared timeline recognizable across transitions. Exact positions and proportions will be established in the next visual study.

Do not reproduce the airline combination of a left booking form, a destination card, supporting deal cards and duplicate navigation docks. Rework grouping, panel shapes/proportions and iconography for the solar tasks. The resemblance should come from material, tactile controls, depth and lighting.

### Transition rules

- A user selection is the reason for a scene transition. No unrelated rotating wallpaper or autoplay theme changes.
- Carry a recognizable lens, lighting palette and glass treatment through the transition so the views feel like one environment.
- Preserve navigation anchors and keyboard focus; users must not chase moving controls.
- Use scene framing and emphasis to explain what was selected. A view change never changes values, selected time or scenario by itself.
- Tie any scientific visual encoding to available data. Navigation motion is separate from scientific time: animated electrical particles would overstate hourly accounting.
- Provide a stable reduced-motion version; let the scene settle while the user reads or works.

## Visual rules to design first

### Environment and colour

Use atmospheric blue, soft cloud white, warm sunlight and a controlled amber solar accent. Retain the existing teal and warning colours where they convey scientific state. Keep the number of competing accents small. Darker sky states may support a selected time or an explicit display theme; a decorative transition must not silently change the modelled time, weather or output.

Cloud depth can establish atmosphere, but unconnected decorative clouds must not appear to be measured site weather. Solar direction, when presented as scientific geometry, remains derived from the linked record. A purely decorative solar mark must be clearly distinct from that geometry.

### Surfaces and layout

Use rounded glass panels, fine light edges and soft separation from the scene. Limit backdrop blur to bounded surfaces. Establish an original hierarchy around the central observation stage and task-specific evidence surface; do not inherit the airline panel positions as constraints.

Analytical workspaces use the same rounded controls, navigation and typography with calmer, more opaque chart/table surfaces. Detailed analysis can occupy the available space without forcing every workspace into the reference's hero composition. Scientific information must remain readable over both bright clouds and darker sky.

### Buttons and controls

Design a reusable family covering:

- Primary pill actions with an amber/sunlit treatment and clear action text.
- Secondary glass buttons with a visible edge and restrained feedback.
- Circular icon buttons with accessible names and discoverable text labels.
- Segmented tabs with a strong selected state.
- Inputs, date/time controls, selectors, sliders, toggles and linked timeline controls.
- Status badges that distinguish selection, loading, uncertainty, simulated data and unavailable capability.

Specify default, hover, pressed, keyboard-focus, selected, disabled, loading and error states. Keep touch targets comfortably sized. Avoid decorative controls without an actual purpose. Define distinct roles for any top tabs, side navigation and bottom dock so they do not compete or duplicate the same task.

### Typography and data

Use clear proportional type for labels and reading, with monospaced numerals where scientific alignment helps. Establish a legible hierarchy before reducing text to fit cards. Keep timestamps, units, uncertainty and lifecycle/source labels near the values they qualify. Exact facts stay available in ordinary page content rather than being baked into the animated scene.

### Motion

Use brief feedback for buttons and a slower, purposeful transition for scene changes. Retain spatial continuity as a user moves between instruments. Keep task panels stationary while the background moves. Do not animate numerical values in ways that suggest a scientific recalculation when none occurred.

Provide reduced-motion equivalents and a complete static/fallback experience. Keep idle animation bounded and stop unnecessary work when hidden or settled. Motion timings are to be tuned in the prototype; the reference does not establish interaction durations.

## First pilot and work sequence

1. **Refined visual storyboard.** The initial three concepts are complete. Next, show three states of one original Helios Lens design: overview, array/solar context and battery/energy-flow context. Demonstrate meaningful scene changes, original panel organization and a consistent glass/button family. Keep the video as the material-quality benchmark, not a layout template.
2. **Control specification.** Set the shared colour, spacing, radii, surface and typography rules, plus complete control states. Resolve navigation roles before spreading the design.
3. **One complete prototype.** Design entry → Observatory → Instrument 06 → Battery workspace. Include desktop and phone layouts, the primary handoff, focused linked interval, timeline selection, panel scrolling and reduced motion. This tests the design in both an atmospheric scene and a data-heavy workspace.
4. **Visual review checkpoint.** Confirm the reference-level glass depth and button quality alongside the user-required original layout and meaningful scene changes. Check continuity, clarity and movement before broad implementation. The deployed version 16 remains the stable reference while this design is reviewed.
5. **Shared shell rollout.** Apply the selected design to common navigation, workspace launcher, timeline, inspector, forms and status presentation.
6. **Instrument and workspace rollout.** Adapt the remaining five mounted instruments and all fourteen workspaces using the shared controls. Preserve each workspace's information hierarchy and scientific role.
7. **Verification and private release.** Recheck numerical parity, same-hour handoffs, saved branches, focus, keyboard use, responsive overflow, reduced motion, scene fallback, contrast and bundle/runtime cost. Publish the redesigned application only within the subsequent implementation scope.

## What must remain continuous

- The selected site, date/hour, dataset and scenario across navigation.
- All six existing instrument-to-workspace handoffs and their focus targets.
- Saved local scenario branches, views and annotations.
- Exact values, energy units, provenance, uncertainty and honest capability labels.
- Working keyboard and touch controls, reduced motion and non-3D access.
- Six mounted instruments, one current placeholder and seven reserved instrument positions unless separately commissioned.

The earlier obsidian/champagne palette and angular control styling are historical choices. The new user direction may replace them. Existing scientific contracts and working user state remain the baseline.

## Definition of a successful first layer

The result should evoke the reference through floating glass surfaces, luminous controls and depth while remaining recognizably its own solar product. Helios Lens anchors one coherent environment whose subject and framing respond meaningfully to the selected mode or instrument. The entry-to-Battery journey preserves context; scientific charts remain legible, and the phone layout rearranges the task instead of shrinking the desktop.

This plan does not start Instrument 07 or add new scientific capabilities. The refined original-layout storyboard is complete; the next stage is review and the complete interactive UI pilot.

## Implemented interactive release — 2026-10-25

The user accepted the three refined visuals and authorized implementation and
private deployment. The new Sunlit entry implements all three states with a
shared context header, labeled view selector, central lens, evidence console and
linked timeline. Scene transitions encode the selected mode; date/hour changes
encode canonical data. The analytical shell now shares the glass/button family.
The original guided six-instrument observatory remains available as an
additional reference-observation view. All fourteen workspaces retain their
scientific roles and existing saved scenario state. See `PROJECT_STATUS.md` for
release scope and the local native Sites receipt for publication identity.
