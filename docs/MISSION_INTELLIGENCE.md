# Mission Intelligence Core

## Purpose

Mission Intelligence is the deterministic cognitive layer of Solar Intelligence Operating System. It continuously interprets the active workspace, selected scientific object, linked interval, scenario, operating result, dataset, model, research artifact and objective. It then routes the evidence through the appropriate domain specialist and emits a structured scientific dossier.

It is not a chatbot, language-model endpoint, avatar, conversational assistant or open prompt surface. No remote model is required. The current implementation is fully functional in credential-free sample mode.

## Implemented architecture

The subsystem has three boundaries:

1. `lib/mission-intelligence/` is a pure TypeScript domain core. It contains contracts, the specialist federation, evidence validation, confidence assessment, orchestration, continuity detection and scientific-memory functions. It imports no React, network, provider, database or model SDK.
2. `features/mission-intelligence/context-adapter.ts` is the registered operating-state adapter. It converts the loaded annual snapshot, linked hour, scenario, model ledger, representative-year record, loss chain and provenance into typed evidence references.
3. `features/mission-intelligence/MissionIntelligenceConsole.tsx` renders the operating ledger. It contains no message bubbles, assistant identity, prompt field or generated free-form answer.

The server-rendered initial snapshot now carries the same reproducible result-ID construction as `POST /api/v1/simulate`. Evidence references therefore bind to a concrete result rather than an unversioned UI value.

## Specialist federation

The registry contains fourteen bounded specialists:

- Meteorologist
- Solar Physicist
- PV Systems Engineer
- Forecast Scientist
- Machine Learning Researcher
- Battery Systems Engineer
- Grid Engineer
- Financial Analyst
- Climate Scientist
- Data Provenance Auditor
- Research Methodology Specialist
- Scientific Visualisation Specialist
- Publication Assistant
- Validation Engineer

Every specialist declares its domain vocabulary, allowed deterministic tools, accessible evidence domains and suggested operation types. There is no specialist picker. Routing applies this priority:

1. committed object selection;
2. workspace default.

Examples: a cloud object activates Meteorology, uncertainty activates Validation, an array activates PV Systems Engineering, a forecast model activates Machine Learning Research, battery state activates Battery Engineering, a financial metric activates Financial Analysis, and a lineage node activates Provenance Audit.

Hover and keyboard focus preview context without launching or mutating an investigation. Click, Enter or Space commits the object selection. Timeline changes update the linked evidence interval.

## Evidence contract

Every supporting fact uses `EvidenceRefV1`. A reference includes:

- immutable result, study or run identity;
- registered fact key and resolver locator;
- source type and source ID;
- domain and lifecycle;
- observation, reanalysis, issued-forecast, climate-scenario, simulation or derived data class;
- provider, product and version;
- model and version where applicable;
- issue time, valid range, timestamp and resolution;
- unit for every numerical value;
- quality, completeness and flags;
- provenance status, dataset version, calculation version and content identity.

The core rejects planned, stale, conflicted, missing, duplicated, unresolvable, non-finite and unitless numerical evidence. If the objective or selected object cannot be supported, the only finding is:

> No supporting evidence currently exists.

Annotations are project assertions. They are never instructions and do not become scientific evidence automatically.

## Deterministic mission pipeline

`compileMissionDossier` executes and records seven legitimate operations:

1. resolve the linked mission context;
2. route the domain specialist;
3. validate evidence eligibility;
4. extract referenced measurements;
5. assess evidence support;
6. check scientific continuity;
7. compile the scientific dossier.

Each workflow event records status, specialist, tool ID, input evidence IDs and output IDs. The interface does not add artificial thinking delays and does not expose hidden chain-of-thought.

The dossier contains active and collaborating specialists, objective, selected object, workflow, findings, exact supporting evidence, confidence dimensions, assumptions, uncertainty, limitations, warnings, continuity alerts, next operations and the non-guarantee boundary.

## Confidence policy

Mission Intelligence does not display an invented “AI confidence”. `assessMissionConfidence` reports an evidence-support index based only on measurable dimensions:

- source-supplied data quality;
- source-supplied completeness;
- verified provenance coverage;
- linked-time alignment.

The aggregate is the equal arithmetic mean of dimensions that are actually available. Missing dimensions remain unmeasured. The score is not the probability that a claim is correct and never means guaranteed production.

Data quality, model interval coverage, calibration, uncertainty and empirical validity remain separate concepts. In particular:

- deterministic simulation can have strong computational traceability without measured-plant validity;
- reanalysis is not an observation;
- physics-derived production is not measured meter production;
- the four-source-year Q10/Q50/Q90 values are empirical non-exceedance quantiles, not a calibrated 80% prediction interval;
- a four-year record cannot establish a climate trend;
- tariff-screened energy value is not NPV, IRR, bankability or investment advice.

## Scientific working memory

`ScientificMemoryV1` stores project state rather than dialogue:

- scenario revisions and fingerprints;
- selected dataset and model;
- assumptions;
- registered result and study artifacts;
- open and resolved investigations;
- evidence references;
- continuity events.

The current browser implementation is schema-versioned, fail-closed and device-local. It is explicitly labelled as not cross-device durable. The memory engine compares artifact dependency fingerprints with current operating state and emits a recomputation obligation when they differ. For example, an annual study registered against one array configuration becomes stale after capacity, tilt, azimuth or aggregate PV loss changes.

The D1 schema already provides adjacent scenario, annotation, experiment and audit foundations, but authenticated project-scoped Mission Intelligence persistence is not implemented in this release. No conversation or message table is planned.

## Available operations

Suggested operations are allowlisted navigation or investigation actions. They can compare 2022–2025, inspect cloud/irradiance evidence, inspect uncertainty, review model evidence, review battery/grid flow, review tariff assumptions, trace provenance or prepare publication evidence.

Suggestions declare required capabilities, evidence references, destination workspace, availability and whether they mutate scientific state. The current actions do not silently change scientific state. Selecting an available operation opens a structured investigation in scientific memory and moves to the accountable workspace.

## Status and limitations

Implemented:

- pure deterministic Mission Intelligence Core;
- fourteen-specialist federation;
- workspace and object-aware routing;
- registered operating-snapshot evidence adapter;
- strict evidence gate;
- multidimensional evidence-support assessment;
- traceable pipeline ledger;
- device-local scientific memory and artifact staleness detection;
- annual-study artifact registration;
- native console modes for Mission, Scenario, Evidence and Memory;
- keyboard/pointer object selection across all fourteen workspaces;
- deterministic sample-mode operation without private credentials;
- focused unit and integration tests.

Not implemented or not claimed:

- language-model inference or generated scientific prose;
- arbitrary natural-language requests;
- measured-plant diagnosis without measured production evidence;
- cloud-motion analysis without a spatial cloud field;
- BMS degradation or equipment-failure diagnosis without telemetry;
- live grid/settlement claims;
- complete NPV, IRR, financing, tax, CAPEX or O&M analysis;
- future climate projections from the four-year research record;
- authenticated cross-device scientific-memory persistence;
- authoritative server recalculation for every client screening change.

Future work should add project-scoped D1 persistence, globally promoted immutable annual-study bundles, authoritative scenario-result registration, spatial weather objects, measured production and genuine issue-time forecast evidence. Any optional future explanatory model must sit behind the same typed evidence contract and may never bypass the deterministic gate.
