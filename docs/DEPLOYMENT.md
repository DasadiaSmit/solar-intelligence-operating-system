# Deployment and operations

## Local development

Requirements:

- Node.js 22.13 or newer.
- A package manager compatible with the checked-in lockfile.
- No credentials are required for sample mode.

Copy `.env.example` to `.env.local` only when enabling optional providers. Never commit `.env.local` or API keys.

```bash
pnpm install
pnpm dev
```

The application starts in deterministic sample mode. Use the health endpoint at `/api/v1/health` to verify calculation version and configured capabilities.

## Build and test

```bash
pnpm build
pnpm test
```

The deployment build packages `.openai/hosting.json` and all Drizzle migrations into `dist/.openai/` for Sites.

## Hosted configuration

Logical bindings are declared in `.openai/hosting.json`:

- `DB`: Cloudflare D1 database for structured metadata and user-owned state.
- `SNAPSHOTS`: optional Cloudflare R2 object store for content-addressed canonical datasets, provider payloads, and manifests. The implementation writes there when the binding exists; sample mode does not require it.

The Worker contains a bounded `scheduled` ingestion handler, but the packaged application does not declare a cron trigger. Configure the intended schedule in the hosting control plane after deployment and verify a completed `provider_runs`/`job_state` record. Until that trigger is configured, scheduled ingestion is dormant. A failed run is recorded and rejects its `waitUntil` task so the platform can surface an operational error.

Optional environment variables are documented in `.env.example`. Configure hosted values through the Sites platform; do not bake them into the bundle.

## Database migrations

Schema changes are made in `db/schema.ts` and generated into `drizzle/`:

```bash
pnpm db:generate
```

Inspect generated SQL before deployment. Migrations must be append-only after release; never rewrite an already-applied production migration. Sites packages the migration directory for platform application.

## Provider operations

- Use pinned provider products/versions for reproducible research.
- Configure Open-Meteo customer host/key if the intended workload requires commercial capacity.
- Keep PVGIS calls server-side and respect documented rate limits.
- Treat Copernicus/ECMWF bulk extraction as an async ingestion workflow.
- Monitor fallback rate and quality-score degradation; frequent fallback is an operational incident, not normal success.

## Health and incident signals

Monitor:

- `/api/v1/health` availability and build/calculation version;
- provider timeout, rate-limit, and fallback counts;
- D1 error rate and migration version;
- simulation latency and memory;
- data-quality coverage/closure/outlier flags;
- model drift/calibration warnings;
- audit-write failures.

## Release checklist

1. Run scientific unit and invariant tests.
2. Run API/SSR integration tests in sample mode with network disabled.
3. Generate and inspect migrations.
4. Verify `.env.example` matches runtime configuration.
5. Verify no secret appears in source, output, logs, or public metadata.
6. Inspect desktop, tablet, mobile, night, low-confidence, error, and reduced-motion states.
7. Confirm every user-visible result exposes provenance and status.
8. Build the Cloudflare-compatible ESM output.
9. Apply access policy and D1 binding through Sites.
10. Configure and verify the production ingestion trigger when live refresh is required.
11. Smoke-test health, simulation, provenance, and saved-state workflows after deployment.

## Rollback

Application releases are immutable and should be rolled back by redeploying the previous known-good artifact. Database migrations are forward-only; corrective migrations must preserve existing records. Provider/model versions are recorded with each result so a software rollback does not obscure historical lineage.
