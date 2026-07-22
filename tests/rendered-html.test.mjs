import assert from "node:assert/strict";
import { access, readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";

import { POST as simulate } from "../app/api/v1/simulate/route.ts";

const root = new URL("../", import.meta.url);

test("simulation API returns a complete, labelled and reproducible annual result", { timeout: 30_000 }, async () => {
  const response = await simulate(new Request("http://local.test/api/v1/simulate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": "test-simulate-0001" },
    body: JSON.stringify({ config: { array: { capacityKwDc: 48, tiltDeg: 31, azimuthDeg: 178 } } }),
  }));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-request-id"), "test-simulate-0001");
  const payload = await response.json();
  assert.equal(payload.apiVersion, "v1");
  assert.equal(payload.ok, true);
  assert.equal(payload.status, "simulated");
  assert.equal(payload.data.hourly.length, 8760);
  assert.equal(payload.data.monthly.length, 12);
  assert.equal(payload.data.config.array.capacityKwDc, 48);
  assert.ok(payload.data.summary.annualGenerationKWh > 0);
  assert.ok(payload.data.summary.p10GenerationKWh <= payload.data.summary.p90GenerationKWh);
  assert.match(payload.meta.resultId, /^sim_/);
  assert.match(payload.meta.guaranteeNotice, /not guaranteed/i);
  for (const field of ["provider", "modelName", "resolution", "units", "dataQuality", "calculationVersion", "assumptions", "uncertainty"]) {
    assert.ok(field in payload.meta, `missing scientific result metadata: ${field}`);
  }
});

test("simulation API rejects invalid engineering bounds", async () => {
  const response = await simulate(new Request("http://local.test/api/v1/simulate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ config: { array: { capacityKwDc: -3 } } }),
  }));
  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "INVALID_QUERY");
});

test("application source contains the complete mission shell and honest status boundary", async () => {
  const [page, layout, shell, workspaces, css, manifest] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/solar-os/SolarOperatingSystem.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/solar-os/workspaces.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../public/site.webmanifest", import.meta.url), "utf8"),
  ]);

  assert.match(page, /buildOperatingSnapshot/);
  assert.match(layout, /Solar Intelligence Operating System/);
  assert.match(shell, /SOLAR INTELLIGENCE/);
  assert.match(shell, /ESTIMATES ARE NOT GUARANTEED PRODUCTION/);
  assert.match(shell, /OFFLINE \/ SAMPLE ACTIVE/);
  assert.match(shell, /aria-label="Solar operating system workspaces"/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /max-width:\s*720px/);
  assert.doesNotMatch(`${page}\n${layout}`, /Your site is taking shape|SkeletonPreview/);
  const workspaceIds = [...workspaces.matchAll(/id:\s*"([A-Z]{2})"/g)].map((match) => match[1]);
  assert.equal(new Set(workspaceIds).size, 14);
  assert.match(workspaces, /IMPLEMENTED|implemented/);
  assert.match(workspaces, /EXPERIMENTAL|experimental/);
  assert.match(workspaces, /PLANNED|planned/);
  assert.match(manifest, /Solar Intelligence Operating System/);
});

test("production output, migration, hosting bindings and worker safeguards are present", async () => {
  const [assets, hosting, worker, migration] = await Promise.all([
    readdir(new URL("../dist/client/assets/", import.meta.url)),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_wealthy_johnny_storm.sql", import.meta.url), "utf8"),
  ]);
  assert.ok(assets.some((name) => name.startsWith("SolarOperatingSystem-") && name.endsWith(".js")));
  assert.ok(assets.some((name) => name.endsWith(".css")));
  const hostingConfig = JSON.parse(hosting);
  assert.match(hostingConfig.project_id, /^appgprj_[a-z0-9]+$/, "Sites project identity must be persisted after creation");
  assert.deepEqual({ d1: hostingConfig.d1, r2: hostingConfig.r2 }, { d1: "DB", r2: "SNAPSHOTS" });
  assert.match(worker, /runScheduledIngestion/);
  assert.match(worker, /X-Content-Type-Options/);
  assert.match(worker, /Permissions-Policy/);
  assert.ok((migration.match(/CREATE TABLE/gi) ?? []).length >= 12);
  await access(new URL("../dist/server/index.js", import.meta.url));
  const clientBundle = assets.find((name) => name.startsWith("SolarOperatingSystem-") && name.endsWith(".js"));
  const bundleStat = await stat(new URL(`../dist/client/assets/${clientBundle}`, import.meta.url));
  assert.ok(bundleStat.size < 250_000, `workspace client module unexpectedly large: ${bundleStat.size} bytes`);
});

test("continuity and scientific documentation are deliverable artifacts", async () => {
  const required = [
    "README.md", "IMPLEMENTATION_PLAN.md", "PROJECT_STATUS.md", ".env.example",
    "GOVERNANCE.md", "CONTRIBUTING.md", "CHANGELOG.md",
    "governance/README.md", "governance/departments.json", "governance/WORKSPACE_OWNERSHIP.md",
    "docs/ARCHITECTURE.md", "docs/SCIENTIFIC_METHODS.md", "docs/MODEL_VALIDATION.md",
    "docs/DATA_PROVIDERS.md", "docs/DATA_PROVENANCE.md", "docs/LIMITATIONS.md",
    "docs/DEPLOYMENT.md", "docs/BACKUP_RECOVERY.md", "docs/SECURITY.md", "docs/THREAT_MODEL.md",
    ".github/CODEOWNERS", ".github/SECURITY.md", ".github/workflows/ci.yml",
  ];
  await Promise.all(required.map((path) => access(new URL(path, root))));
});
