# PET — Photovoltaic Evidence & Triage

## Mission

Provide an evidence-grounded Solar Copilot that helps users understand linked results, trace provenance, diagnose data or model concerns and prepare reversible scenario proposals. PET is a scientific explanation and triage layer, not an autonomous operator, engineering certifier or source of guaranteed production claims.

## Current truth

- PET is planned; no assistant UI, model provider, chat endpoint, retrieval index, conversation schema or assistant tool layer exists.
- `app/chatgpt-auth.ts` supports hosted identity only. It is not an AI assistant integration.
- The platform already exposes the typed scientific snapshot, provenance, lifecycle states, quality, assumptions, uncertainty and scenario calculations PET will need.
- Sample mode is deterministic and offline-capable. PET must begin with a deterministic offline explanation layer and remain useful when no language model or private credential is available.
- No assistant performance, safety or scientific-quality claim may be made until the evaluation gates in this charter pass.

## Ownership boundary

The department owns future:

- `features/copilot/**` for the dock, evidence citations, proposed actions and conversation state;
- `lib/copilot/**` for contracts, context assembly, grounding, policy and approved tool registry;
- `app/api/v1/copilot/**` for bounded orchestration when an optional model is enabled;
- `tests/copilot/**`, `docs/COPILOT_SAFETY.md` and `docs/COPILOT_EVALUATION.md`;
- later assistant-session, message, tool-run, citation and feedback persistence after Platform/Security review.

PET does not own scientific calculations, provider data, lifecycle status, user authentication, deployment, database authorization or UI design primitives. It may read approved evidence and draft typed actions; authoritative departments execute and validate those actions.

## Interfaces

- Consume a versioned `CopilotContextV1` containing current workspace, linked timestamp, scenario branch/hash, result ID, provider/data class, model/version, issue and valid time, units, quality, calculation version, assumptions, uncertainty and provenance IDs.
- Consume only approved typed tools such as `explain-linked-hour`, `explain-annual-yield`, `compare-scenarios`, `trace-provenance`, `diagnose-quality` and `draft-scenario`.
- Return structured claims with machine-verifiable `EvidenceRef` objects identifying result ID and exact claim path.
- Return state changes only as `ProposedUiCommandV1` diffs. Features validates them, Experience displays them and the user must explicitly confirm them.
- Record confirmed tool use through the audit interface without placing secrets or unrestricted raw provider content in prompts.
- Optional model providers must sit behind an environment-configured adapter; the deterministic tool/explanation layer remains the fallback.

## Decision authority

The department has final authority over assistant interaction policy, approved tool schemas, grounding format, response structure, safety evaluation and model-adapter selection within approved security constraints.

It has no authority to promote scientific lifecycle, override a validation warning, silently modify state, access a new data source, retain conversations or enable a remote model without the responsible Science, Security, Platform and Product approvals.

## First deep-work programme

1. Define `CopilotContextV1`, `EvidenceRef`, `ToolResultV1`, `ProposedUiCommandV1` and stable refusal/error envelopes.
2. Write the safety, grounding, privacy and retention policy before adding a language-model adapter.
3. Implement deterministic offline tools for linked-hour explanation, annual-yield explanation, scenario comparison, provenance tracing and quality triage.
4. Build an offline PET dock that renders evidence cards, limitations and proposed scenario diffs without free-form model output.
5. Create a golden evaluation corpus covering scientific questions, missing evidence, simulated data, low quality, conflicting providers, stale forecasts and unsafe action requests.
6. Add an optional read-only language-model orchestration adapter only after deterministic tools and evaluations pass.
7. Permit scenario drafting after confirmation UI and audit logging pass; do not grant direct apply, delete, publish, deploy or configuration tools.
8. Consider durable conversation history only after tenant authorization, retention, deletion and privacy controls are approved.

## Definition of done

- Every numerical claim contains an evidence reference to the exact canonical result field and result ID.
- Every response discloses provider/data class, model/version, issue or valid time, quality, assumptions and uncertainty when relevant.
- Observed, forecast, reanalysis, simulated and sample data are never conflated.
- Missing or conflicting evidence produces an explicit limitation or refusal, not an invented answer.
- PET never describes estimated generation as guaranteed, bankable or certified.
- Scenario changes appear as a complete diff and require explicit user confirmation before Features applies them.
- PET has no arbitrary network, code-execution, database or secret-reading tool.
- Provider content, imported documents and annotations are treated as untrusted evidence rather than instructions.
- The deterministic offline experience works with no model credential and with the remote model unavailable.
- Tool calls, evidence references, confirmations and model/version are auditable.
- Privacy, retention and deletion behavior is documented and tested before persistence is enabled.

## Measures

- At least 100 golden scientific, provenance, scenario and safety cases before optional model release.
- One hundred percent machine-verifiable evidence coverage for numerical claims.
- Zero silent or unconfirmed state mutations.
- Zero secret exposure in adversarial prompt and tool tests.
- Separate grounded-correctness, citation-correctness, calibration, refusal and action-safety scores.
- Successful offline completion rate for the core explanation and triage intents.
- User correction and unsupported-claim rates tracked by model/version without using private project data for training by default.

## Risks and escalation

- Fluent language can hide weak grounding. Block release when a claim cannot be reconstructed from its evidence reference.
- Prompt injection may arrive through provider payloads, documents or annotations. Escalate any request for new retrieval or network scope to Security.
- Users may treat PET as an engineer or investment adviser. Require clear scope language and escalate site safety, bankability, electrical design and investment decisions to qualified professionals.
- Conversation persistence creates privacy and tenant-boundary risk. Keep PET session-only until authorization, retention and deletion are proven.
- Model updates can change behavior without code changes. Pin and display model versions and rerun the full evaluation gate before promotion.
- If lifecycle, provider class or uncertainty is ambiguous, PET must stop and request evidence rather than infer authority.
