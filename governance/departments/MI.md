# Mission Intelligence Core (`MI`)

## Mission

Make Solar Intelligence OS itself context-aware, evidence-gated and scientifically continuous. Mission Intelligence Core understands the active workspace, selected object or interval, result, datasets, model, experiment, scenario and objective; routes bounded work through the correct domain specialists; and returns traceable findings and next investigations without becoming a chat interface or replacing any scientific engine.

## Current truth

- The operating snapshot, annual research study, provider layer and provenance contracts already expose typed values, lifecycle, data class, quality, assumptions, uncertainty, model identity and reproducibility identifiers.
- The linked shell now shares workspace, scenario, hourly cursor, semantic object selection, objective, result identity, model, evidence bundle, registered artifacts and device-local scientific-memory revisions through one typed Mission context.
- Scenario controls include a clearly labelled client-side screening approximation. Mission Intelligence may describe it only as simulated screening evidence and must not present it as authoritative STAR Engine output.
- D1 schemas already reserve scenarios, saved workspaces, annotations, experiments and audit events. Mission Intelligence v1 adds versioned device-local investigation and artifact memory; authenticated D1 finding/evidence/recomputation persistence remains unimplemented.
- The deterministic core, native console, object routing, evidence adapter, confidence policy and continuity detector are executable and tested. No chat surface, conversational persona, free-form answer generator or language-model inference belongs to v1.
- Sample mode must remain useful offline and must produce the same structured finding for the same context, evidence and policy versions.

## Ownership boundary

MI owns these active and reserved boundaries:

- `features/mission-intelligence/**` for the native console, workflow progress, evidence ledger, suggested investigations and scientific-memory views;
- `lib/mission-intelligence/**` for context assembly, object semantics, evidence resolution, specialist registry, deterministic tools, orchestration, confidence policy, findings and stale-state detection;
- `app/api/v1/mission/**` for bounded server orchestration and owner-scoped scientific-memory operations;
- `tests/mission-intelligence.test.mjs` for contract, grounding, routing, conflict, staleness, memory and action-safety evidence;
- `docs/MISSION_INTELLIGENCE.md` for implemented architecture, scientific policy, status and limitations;
- `docs/MISSION_INTELLIGENCE_SAFETY.md` and `docs/MISSION_INTELLIGENCE_EVALUATION.md` for the executable policy and release evidence.

MI does not own provider science, solar formulae, energy dispatch, forecast training, validation thresholds, financial assumptions, lifecycle promotion, user authentication, database authorization, visual design primitives or deployment. Each specialist reads approved evidence and invokes tools owned by the accountable domain; it cannot reinterpret or override that domain's result.

Scientific memory is project state, not dialogue. It may retain versioned scenario changes, configuration hashes, dataset/model choices, assumptions, annotations as user assertions, objectives, investigations, findings, dependency hashes and unresolved recomputation obligations. It must not create message history, personas or hidden behavioural profiles.

## Interfaces

- Consume `MissionContextV1`, containing context/revision IDs, workspace, stable selected object or time range, objective, site, result/scenario hashes, active datasets, model, experiment, annual study, unresolved investigations and warnings.
- Consume `MissionSelectionV1` events emitted by charts, maps, timeline, digital twin and tables. An array index alone is never a durable scientific identity.
- Resolve each claim through `EvidenceRefV1`, identifying an immutable result, study, snapshot or model artifact; exact value path and hash; units; lifecycle; data class; issue/valid time; quality and provenance integrity.
- Route automatically through versioned `MissionSpecialistDefinition` records. Workspace defaults establish the initial specialist; a selected object's semantics override that default; an objective may add supporting specialists without requiring manual switching.
- Specialists receive only the datasets and allowlisted tools declared by their manifest. Meteorology cannot publish financial results; Financial Analysis cannot reinterpret irradiance physics; Publication cannot introduce a scientific claim.
- Emit `MissionFindingV1` with support state, structured claims, evidence, confidence dimensions, assumptions, uncertainty, models used, data sources, limitations and suggested next investigations.
- Missing evidence must emit the exact finding: `No supporting evidence currently exists.` It must name the missing prerequisite without filling the gap by inference.
- Emit legitimate pipeline stages—context resolved, evidence loaded, calculation run, invariants checked, uncertainty assessed and finding assembled—without exposing hidden reasoning.
- Emit state changes only as complete `ProposedUiCommandV1` diffs. FEATURES validates them, EXPERIENCE renders them, the user confirms them and PLATFORM records the audit event.
- Publish `ScientificMemoryEventV1` for confirmed state changes and completed investigations. Dependency hashes drive deterministic stale-result and recomputation notices.

The specialist federation contains fourteen desks: Meteorology, Solar Physics, PV Systems Engineering, Forecast Science, Machine-Learning Research, Battery Systems, Grid Systems, Financial Analysis, Climate Science, Data Provenance Audit, Research Methodology, Validation, Scientific Visualisation and Publication. A specialist may be active only when its definition, evidence requirements and tools are executable.

## Decision authority

MI has final authority over context assembly, specialist-routing precedence, evidence-reference format, finding schema, deterministic orchestration, confidence-policy mechanics, unsupported/conflict/stale behavior, scientific-memory semantics and the boundary for proposed actions.

MI has no authority to change a scientific value, promote a model or lifecycle, suppress a limitation, equate data quality with confidence, relabel reanalysis or simulation as observation, call physics-derived generation measured production, or execute a state mutation without confirmation. Scientific eligibility rules require approval from the relevant domain, DATA, RESEARCH and QA; persistence and authorization require PLATFORM and SECOPS approval.

## First deep-work programme

1. Freeze `MissionContextV1`, `ObjectSelectionV1`, `EvidenceRefV1`, `SpecialistManifestV1`, `MissionFindingV1`, `ConfidenceAssessmentV1`, `ScientificMemoryEventV1` and stable unsupported/error envelopes.
2. Give every active result and scenario an immutable identity and configuration hash; move annual-study evidence into the global evidence registry.
3. Replace index-only interactions with typed object/range selection events carrying result identity and exact evidence paths.
4. Implement deterministic tools for linked-hour inspection, annual-yield decomposition, compatible period/scenario/model comparison, uncertainty inspection, provenance tracing and quality diagnosis.
5. Implement specialist routing with object semantics taking precedence over workspace defaults and objective decomposition adding bounded supporting specialists.
6. Implement a versioned evidence gate that rejects missing, stale, conflicted, semantically substituted, unit-incompatible, temporally misaligned or lifecycle-ineligible inputs before a finding is assembled.
7. Implement scientific memory and recomputation obligations through forward migrations and an offline-capable versioned local store; never rewrite an applied migration.
8. Build the native Mission Intelligence console with active specialist, objective, workflow, evidence, confidence, assumptions, uncertainty, limitations and suggested investigations—without messages, bubbles or a generic prompt box.
9. Create golden evaluations for every workspace and object family, including sample/reanalysis distinction, physics-target limits, four-year uncertainty, zero-sample metrics, missing issue time, stale scenarios, conflicting evidence and untrusted annotations.
10. Permit proposed scenario operations only after complete-diff validation, confirmation, authorization and immutable audit tests pass.

## Definition of done

- Every numerical or categorical scientific claim contains at least one machine-resolvable evidence reference; numerical claims also carry units.
- Every finding discloses provider/data class, model/version, issue or valid time, quality, calculation version, assumptions, uncertainty and limitations when relevant.
- Observation, issued forecast, reanalysis, typical meteorological year, simulation and user assertion are never conflated.
- Data quality remains separate from prediction uncertainty, validation fitness and Mission Intelligence confidence.
- Model comparisons fail closed when target, horizon, split, units or evaluation period are incompatible; zero-sample metrics are never interpreted as perfect performance.
- Four-source-year non-exceedance quantiles are never presented as calibrated interval coverage.
- Missing, conflicting, stale or ineligible evidence returns an explicit support state and never a fabricated explanation.
- The active specialist changes deterministically with workspace and selected-object context; users do not manually choose a persona.
- Pipeline progress reflects actual typed operations and contains no hidden reasoning trace.
- Scientific memory can reconstruct scenario/model/dataset/assumption changes, unresolved investigations and recomputation obligations without storing dialogue.
- Provider content, imported documents and annotations remain untrusted evidence or user assertions, never executable instructions.
- No arbitrary network, code-execution, secret-reading, delete, deployment or publication capability is available through MI.
- Every proposed state change has a complete diff, explicit confirmation, authorization decision and audit record.
- Offline sample mode works without private credentials and is deterministic under pinned evidence and policy versions.

## Measures

- One hundred percent resolvable evidence coverage for scientific claims and one hundred percent unit coverage for numerical claims.
- Zero class-confusion defects among observation, forecast, reanalysis, TMY, simulation and user assertion in golden evaluations.
- Zero unsupported claims returned as supported; unsupported, conflict and stale-case recall reported separately.
- One hundred percent deterministic specialist-routing agreement across the workspace/object routing corpus.
- One hundred percent stale-result detection when scenario, dataset, model, calculation or policy dependency hashes change.
- Zero silent or unconfirmed state mutations and zero cross-owner scientific-memory access in integration tests.
- Confidence assessments report evidence coverage, provenance integrity, temporal alignment, data quality, validation fitness and uncertainty adequacy separately; no uncalibrated aggregate is presented as probability of truth.
- Offline core-tool completion rate, finding latency and memory-event replay determinism are measured by policy/version.

## Risks and escalation

- **Fluent but unsupported presentation:** block release if a displayed claim cannot be reconstructed from its evidence references and deterministic tool result.
- **Context contamination:** reject findings when selected object, scenario, result, dataset or model identities do not agree; never borrow evidence from another branch silently.
- **Data-quality/confidence confusion:** keep DQ, uncertainty, validation and confidence dimensions visibly distinct and block any collapsed score without a versioned policy.
- **Scientific-memory poisoning:** store annotations as user assertions, validate all payloads and retain author/project/result identity; external text never changes routing or tool instructions.
- **Stale continuity:** create recomputation obligations whenever a dependency hash changes; do not merely warn after using stale evidence.
- **Specialist authority creep:** a manifest may not expose tools or datasets outside its approved domain. Cross-domain work requires an explicit orchestration step and retains every contributing specialist.
- **Operational advice overreach:** site safety, bankability, electrical design and investment commitments require qualified professional review; MI reports evidence boundaries rather than certifying decisions.
- **Persistence or tenant ambiguity:** keep memory device-local and explicitly ephemeral until owner/tenant authorization, retention, deletion and recovery controls are verified.
- **Lifecycle ambiguity:** if lifecycle, provider class, target, units, uncertainty or validity is unclear, MI stops and returns the missing-evidence state rather than inferring authority.
