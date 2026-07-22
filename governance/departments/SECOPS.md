# Security, Reliability & Release (`SECOPS`)

## Mission

Protect source, identities, data, scientific integrity and operational continuity while making releases reproducible and recoverable. SECOPS defines the security and release gates; it does not claim a control is active until configuration and verification evidence exist.

## Current truth

- Credentials are intended for runtime environment variables, `.env*` files are ignored except `.env.example`, and sample mode requires no private key.
- API request bodies are bounded, provider retries/timeouts are bounded, user-owned scenarios are owner-scoped, and the Worker sets content-type, referrer, permissions and frame headers.
- Return paths are validated in the retained ChatGPT authentication helper.
- Security, deployment and backup/recovery documentation exists.
- The hosted deployment and optional D1/R2 bindings exist, but scheduled ingestion has no configured trigger in the packaged application.
- A tested Content Security Policy is not implemented.
- Application rate limiting, tenant membership, full RBAC, signed manifests, SBOMs, release attestations and automated backup verification are not implemented.
- Secret scanning, push protection, vulnerability alerts, private vulnerability reporting and branch protection are repository settings and must be verified after GitHub publication; their presence must not be inferred from source files.
- No automated GitHub release pipeline, CodeQL workflow, dependency-review gate or recorded D1/R2 restore drill exists yet.

## Ownership boundary

SECOPS is primary steward for:

- `.github/workflows/**`, repository security policy, dependency automation and release gates.
- `.env.example`, secret-handling policy and deployment configuration review.
- `docs/SECURITY.md`, `docs/DEPLOYMENT.md`, `docs/BACKUP_RECOVERY.md` and the threat model.
- Worker security-header policy with PLATFORM.
- Incident response, vulnerability intake, access review, backup/restore evidence and release/rollback procedure.
- Repository rulesets and least-privilege access configuration after publication.

SECOPS does not own scientific acceptance, provider licensing, product priorities or persistence implementation alone. It may block release when those areas create unresolved confidentiality, integrity, availability or scientific-misrepresentation risk.

## Interfaces

- **PLATFORM:** identity trust, authorization, rate limits, audit delivery, CSP, logging and runtime hardening.
- **DATA and RESEARCH:** licences, retention, sensitive datasets, manifest integrity and reproducible artifact custody.
- **ARCH:** threat boundaries, dependency policy and release-compatible architecture.
- **QA:** CodeQL/dependency checks, security regression tests and release evidence.
- **FEATURES, EXPERIENCE and PET:** secure user flows, safe rendering/export and assistant abuse controls.
- **All departments:** vulnerability remediation, dependency ownership and rollback readiness.

## Decision authority

SECOPS controls release security gates, vulnerability severity, secret response, access policy, backup acceptance and emergency rollback. The product owner controls business release timing but cannot relabel a failed security gate as passed. Scientific-output incidents are jointly governed with RESEARCH and the relevant scientific department. Emergency exceptions require a named owner, documented exposure, compensating control and expiry.

## First deep-work programme

1. Verify the repository is private and configure a protected `main` ruleset with required checks, resolved conversations, blocked force-push/deletion and least-privilege bypass.
2. Enable and record the status of vulnerability alerts, Dependabot security updates, secret scanning, push protection and private vulnerability reporting where the account supports them.
3. Add a private vulnerability-reporting policy; public issues must not be used for undisclosed vulnerabilities.
4. Build a threat model covering hosting-injected identity, scenario ownership, provider SSRF boundaries, D1/R2, exports, assistant behavior and scientific-integrity attacks.
5. Implement and test application rate limiting and tenant/RBAC enforcement with PLATFORM before those controls are marked implemented.
6. Deploy CSP in report-only mode, resolve violations and enforce it only after exact production-build testing.
7. Add dependency review, CodeQL or equivalent static analysis, secret checks and lockfile-based builds to CI.
8. Generate an SBOM and release evidence linking source commit, dependency lock, calculation/model/dataset versions, migration set and deployed artifact hash.
9. Execute and document D1 metadata and R2 snapshot backup/restore drills; GitHub is not the sole backup.
10. Define incident playbooks for credential exposure, authorization leakage, provider compromise, incorrect scientific output and failed deployment.

## Definition of done

- A control is labelled implemented only after configuration and a passing verification record.
- Source reaches `main` through protected review/check rules; no credentials or private data enter commits or build artifacts.
- Identity, tenant and role decisions are server-enforced and tested at the hosting trust boundary.
- The release identifies source commit, dependencies, migrations and scientific version identifiers.
- Rollback and data recovery have current, exercised instructions with named evidence.
- High/critical vulnerabilities have an owner, containment state and documented disposition.
- Security headers and CSP are verified against the deployed build without breaking required functionality.
- Scientific corrections preserve original lineage and supersede affected results rather than deleting evidence.

## Measures

- Zero committed secrets and zero unresolved high/critical vulnerabilities at release.
- One hundred percent of required GitHub controls have dated verification records; unknown settings remain `unverified`.
- All privileged and durable mutation paths have authorization and audit tests.
- Restore success, recovery time and recovery point are measured during drills before any recovery objective is claimed.
- Dependency and static-analysis findings are triaged to an owner and due date.
- Every release has a reproducible evidence manifest and documented rollback target.
- Security exceptions are time-bounded; expired exceptions block release.

## Risks and escalation

- **Identity-header spoofing:** disable hosted writes if the ingress trust boundary cannot be verified.
- **Credential exposure:** rotate immediately, preserve logs, inspect history and invalidate affected artifacts.
- **Authorization leakage:** treat cross-user access as critical and suspend the affected write/read path.
- **Incorrect scientific output:** preserve provenance, mark result IDs superseded and coordinate an evidence-backed correction.
- **Provider compromise or licence breach:** disable the provider, preserve manifests and consult DATA/RESEARCH before reuse or retention.
- **Failed restore:** do not represent backup as operational until an end-to-end restore succeeds.
- **Supply-chain uncertainty:** pin and review dependencies; block a release when provenance cannot be established for critical artifacts.
