# Experience Design and UI Systems

## Mission

Create a coherent, accessible and high-trust operating environment for scientific solar work. The department owns how the platform communicates state, uncertainty, provenance and action across desktop, tablet and mobile; it does not own the scientific values being communicated.

## Current truth

- The premium observatory and daylight themes are implemented with Instrument Sans, Intel One Mono and semantic colour tokens.
- The mission shell, workspace rail, inspector, orbital deck, command palette, focus mode, annotations and keyboard shortcuts are implemented.
- Responsive phone, tablet and desktop rules, reduced-motion support, forced-colour support, focus trapping and roving inspector tabs exist.
- Theme and saved-view preferences are device-local. The shell does not yet use a shared context/reducer, URL-addressable workspace state or a dockable layout model.
- There is no isolated component library, automated visual-regression suite or automated browser accessibility suite.
- `app/globals.css` and `components/solar-os/SolarOperatingSystem.tsx` remain cross-department merge hotspots. Existing browser verification is documented, but the latest corrected mobile/tablet pixels still require the manual acceptance checklist in `PROJECT_STATUS.md`.

## Ownership boundary

The department owns:

- `app/layout.tsx`, `app/globals.css`, `app/loading.tsx`, `app/error.tsx` and `app/not-found.tsx`;
- brand-facing assets in `public/`, including the favicon, manifest and social card;
- the presentational shell currently embedded in `components/solar-os/SolarOperatingSystem.tsx`;
- future `components/design-system/**`, `features/operating-shell/**`, `tests/ui/**`, `tests/accessibility/**` and `tests/visual/**` paths;
- design tokens, typography, spacing, motion, interaction states, responsive composition and accessible UI primitives.

The department does not own solar calculations, provider interpretation, forecast metrics, lifecycle classification, provenance semantics or visualisation geometry. Workspace-specific composition belongs to Features; Canvas/WebGL and geospatial rendering belong to Digital Twin and Visual Computing.

Until the monolith is split, changes to `app/globals.css`, `components/solar-os/SolarOperatingSystem.tsx` or `components/solar-os/workspaces.tsx` require review from every department whose behavior is touched.

## Interfaces

- Consume canonical `ScientificResult<T>` metadata and never provider-specific payloads.
- Consume `OperatingUIStateV1` for workspace, linked time, scenario, model, quality and layout state.
- Render workspaces registered through `WorkspaceDefinitionV2`; do not hard-code scientific capabilities into navigation.
- Dispatch typed `UiCommandV1` actions for navigation, replay, layout and proposed scenario operations.
- Host Digital Twin renderers through a stable renderer boundary with a complete non-WebGL fallback.
- Render Mission Intelligence as a native console and workflow surface, never a chat panel; its findings, evidence links, pipeline stages and proposed actions must use the same status and confirmation primitives as the rest of the OS.

## Decision authority

The department has final authority over design tokens, typography, component behavior, shell layout, responsive breakpoints, interaction consistency, accessibility acceptance and motion policy.

It may block a release for inaccessible controls, unreadable uncertainty, misleading visual hierarchy, broken responsive behavior or missing user feedback. It may not rename a scientific status, alter a numerical result, hide a material limitation or promote a feature lifecycle without Scientific Governance approval.

## First deep-work programme

1. Extract tokens, typography and reusable primitives without changing behavior or scientific content.
2. Split the mission header, workspace rail, inspector, orbital deck, command palette and dialogs from the current shell.
3. Move shell state onto the shared typed reducer and registered command system supplied with Features.
4. Separate global, shell, workspace and visualisation styles so departments have non-overlapping files.
5. Introduce versioned, responsive panel layouts with resize, dock, reset and device-local persistence before durable multi-device sync.
6. Make workspace, selected time and scenario branch deep-linkable without exposing unsafe or unvalidated state.
7. Build documented specimens for loading, empty, error, offline, stale, low-confidence, night, extreme-weather, disabled and read-only states.
8. Add automated keyboard, contrast, reduced-motion, responsive and visual-regression coverage for both themes.

## Definition of done

- WCAG 2.2 AA contrast and keyboard operation pass for every user-facing flow.
- Focus is visible, trapped only inside modal dialogs and restored after dismissal.
- The complete analytical workflow remains usable with reduced motion, forced colours and WebGL unavailable.
- Both themes are verified at 360, 768, 1024, 1440 and 1920 CSS pixels.
- Every workspace has explicit loading, empty, error, offline and low-quality presentation.
- Scientific status, units, provenance and uncertainty remain visible at the point of interpretation.
- No design-system component calculates or silently transforms a scientific value.
- Base-shell and lazy-workspace bundle budgets are defined and enforced in release tests.
- New primitives include usage guidance and automated accessibility coverage.

## Measures

- Zero critical or serious automated accessibility violations on release surfaces.
- One hundred percent keyboard completion of navigation, scenario inspection, replay, annotation and export flows.
- Visual-regression coverage for all 14 workspaces in both themes and required state variants.
- No unapproved raw colour values outside token or scientific colour-scale files.
- Stable shell bundle size and interaction latency against the documented performance baseline.
- Reduced usability defects and cross-department CSS conflicts per release.

## Risks and escalation

- Dense information can become illegible when responsiveness is treated as simple scaling. Escalate when a workspace needs an alternate mobile task flow rather than compression.
- Visual polish can accidentally imply certainty. Escalate any design that makes simulated, planned or low-confidence output look operationally authoritative.
- The current monolithic stylesheet creates merge and regression risk. Structural extraction takes priority over simultaneous large visual changes.
- Docking and persistence can expose hidden or stale state. Escalate schema changes to Features and Platform before shipping them.
- Any accessibility exception, lifecycle-label conflict or hidden scientific limitation requires written approval from the relevant authority; it cannot be accepted informally by Design.
