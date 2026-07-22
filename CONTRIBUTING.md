# Contributing to Solar Intelligence OS

## Start with a department

Choose one primary department from [`governance/departments.json`](governance/departments.json). If the work changes a shared contract, list every contributing department before editing code.

Open a department issue and include:

- the accountable outcome;
- current lifecycle: implemented, experimental, simulated or planned;
- affected paths, workspaces and interfaces;
- scientific/data/security impact;
- acceptance criteria and verification;
- documentation, migration and rollback needs.

## Branch and commit conventions

- Normal branch: `dept/<department-slug>/<issue>-<short-name>`.
- Keep one primary outcome per pull request.
- Prefer changes below 500 non-generated source lines when a safe vertical slice permits.
- Use scoped commits such as `feat(features):`, `science(solar):`, `data(provenance):`, `test(qa):`, `security(release):` or `docs(research):`.
- Do not rewrite applied migrations or erase accepted decision history.

## Development

Requirements: Node.js 22.13+ and pnpm 11+.

```bash
pnpm install --frozen-lockfile
pnpm run test:departments
pnpm exec tsc --noEmit
pnpm run lint
pnpm test
```

Add focused tests for the changed behavior. A passing broad suite does not replace domain-specific evidence.

## Scientific and data rules

- Document every formula, constant, unit conversion, assumption and approximation affected by the change.
- Use chronological validation for time series; never leak future observations into training or tuning.
- Every numerical result retains provider, data class, issue/valid time, resolution, units, quality, versions, assumptions, uncertainty and warnings.
- Sample, simulated, reanalysis, forecast and observed records must remain distinguishable.
- Do not fabricate datasets, training runs, metrics, terrain, provider availability or model superiority.
- A new provider needs licence, rate-limit, retention, schema, fallback and provenance review.

## Security and privacy

- Never commit secrets, `.env.local`, provider tokens, private telemetry, licensed bulk datasets or personal information.
- Treat imported files, provider text, annotations and Mission Intelligence context as untrusted data or user assertions, never executable instructions.
- Authentication is not authorization; server-side ownership and role checks remain mandatory.
- Report vulnerabilities privately through GitHub Security Advisories, not public issues.

## Pull requests

Use the pull-request template. The PR must state:

- primary and contributing departments;
- outcome and linked issue;
- lifecycle boundary;
- scientific/data evidence;
- API, schema, migration and version impact;
- security/privacy impact;
- checks performed;
- UI/accessibility evidence when relevant;
- rollback and known limitations.

Pull requests are squash-merged after required checks pass. With one maintainer, required approvals may remain zero to avoid deadlock; require a code-owner approval when a second maintainer joins.
