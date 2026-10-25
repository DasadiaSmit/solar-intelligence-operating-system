import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readText = (path) => readFile(resolve(root, path), "utf8");
const readJson = async (path) => JSON.parse(await readText(path));

const expectedDepartments = [
  "ARCH", "EXPERIENCE", "FEATURES", "SOLAR", "ENERGY", "DATA", "FORECAST",
  "TWIN", "MI", "PLATFORM", "QA", "SECOPS", "RESEARCH",
];
const expectedWorkspaces = ["DT", "AF", "WA", "ML", "RV", "AE", "SR", "BE", "RM", "CL", "FI", "PA", "RP", "MC"];
const expectedHeadings = [
  "Mission", "Current truth", "Ownership boundary", "Interfaces", "Decision authority",
  "First deep-work programme", "Definition of done", "Measures", "Risks and escalation",
];
const allowedChecks = new Set(["department-registry", "dependency-security", "typecheck", "lint", "science", "build", "smoke"]);

test("department registry has unique, resolvable and accountable departments", async () => {
  const [registry, labels] = await Promise.all([
    readJson("governance/departments.json"),
    readJson("governance/github-labels.json"),
  ]);
  const labelNames = new Set(labels.map((label) => label.name));

  assert.equal(registry.schemaVersion, "1.0.0");
  assert.deepEqual(registry.departments.map((department) => department.id), expectedDepartments);
  assert.equal(new Set(registry.departments.map((department) => department.id)).size, registry.departments.length);
  assert.equal(new Set(registry.departments.map((department) => department.slug)).size, registry.departments.length);

  const departmentIds = new Set(registry.departments.map((department) => department.id));
  const primaryOwners = new Map();
  for (const department of registry.departments) {
    assert.match(department.id, /^[A-Z][A-Z0-9_-]+$/);
    assert.match(department.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(["active", "forming", "planned"].includes(department.operatingState));
    assert.ok(department.mission.length >= 20);
    assert.ok(department.currentObjectives.length >= 1);
    assert.ok(department.interfaces.length >= 1);
    assert.ok(department.requiredChecks.every((check) => allowedChecks.has(check)));
    assert.ok(department.labels.every((label) => labelNames.has(label)), `${department.id} has a label missing from governance/github-labels.json`);

    await access(resolve(root, department.charter));
    const charter = await readText(department.charter);
    for (const heading of expectedHeadings) {
      assert.match(charter, new RegExp(`^## ${heading}$`, "m"), `${department.id} charter is missing ${heading}`);
    }

    for (const path of department.primaryPaths) {
      assert.equal(primaryOwners.has(path), false, `${path} has two primary department owners`);
      primaryOwners.set(path, department.id);
      await access(resolve(root, path));
    }
    for (const boundary of department.interfaces) {
      assert.ok(departmentIds.has(boundary.departmentId), `${department.id} references unknown department ${boundary.departmentId}`);
      assert.notEqual(boundary.departmentId, department.id);
      assert.ok(boundary.contract.length >= 3);
      assert.ok(boundary.artifact.length >= 1);
    }
  }

  const missionIntelligence = registry.departments.find((department) => department.id === "MI");
  assert.equal(missionIntelligence.operatingState, "active");
  assert.ok(missionIntelligence.primaryPaths.includes("lib/mission-intelligence"));
  assert.ok(missionIntelligence.primaryPaths.includes("features/mission-intelligence"));
});

test("all 14 workspaces have exactly one valid accountable department", async () => {
  const [registry, source] = await Promise.all([
    readJson("governance/departments.json"),
    readText("components/solar-os/workspaces.tsx"),
  ]);
  const departmentIds = new Set(registry.departments.map((department) => department.id));
  const workspaceIds = registry.workspaces.map((workspace) => workspace.id);
  assert.deepEqual(workspaceIds, expectedWorkspaces);
  assert.equal(new Set(workspaceIds).size, 14);

  for (const workspace of registry.workspaces) {
    assert.ok(departmentIds.has(workspace.primaryDepartment));
    assert.equal(workspace.contributors.includes(workspace.primaryDepartment), false);
    assert.ok(workspace.contributors.length >= 1);
    assert.ok(workspace.contributors.every((departmentId) => departmentIds.has(departmentId)));
  }

  const runtimeWorkspaceIds = [...source.matchAll(/id:\s*"([A-Z]{2})"/g)].map((match) => match[1]);
  assert.deepEqual(runtimeWorkspaceIds, expectedWorkspaces);
});

test("dependency-security exceptions are exact, owned and time-bounded", async () => {
  const [registry, exceptions, workspaceConfig] = await Promise.all([
    readJson("governance/departments.json"),
    readJson("governance/security-exceptions.json"),
    readText("pnpm-workspace.yaml"),
  ]);
  const departmentIds = new Set(registry.departments.map((department) => department.id));
  const advisoryIds = new Set();
  const ignoredAdvisories = [...workspaceConfig.matchAll(/^\s+- (GHSA-[a-z0-9]{4}(?:-[a-z0-9]{4}){2})$/gm)].map((match) => match[1]);
  assert.deepEqual(ignoredAdvisories.toSorted(), exceptions.exceptions.map((exception) => exception.advisoryId).toSorted(), "every ignored advisory must have an active exception, and vice versa");

  assert.equal(exceptions.schemaVersion, "1.0.0");
  assert.ok(Array.isArray(exceptions.exceptions));
  for (const exception of exceptions.exceptions) {
    assert.match(exception.advisoryId, /^GHSA-[a-z0-9]{4}(?:-[a-z0-9]{4}){2}$/);
    assert.equal(advisoryIds.has(exception.advisoryId), false);
    advisoryIds.add(exception.advisoryId);
    assert.ok(departmentIds.has(exception.ownerDepartment));
    assert.equal(exception.status, "temporary");
    assert.ok(Date.parse(exception.expiresAt) > Date.now(), `${exception.advisoryId} security exception has expired`);
    assert.match(workspaceConfig, new RegExp(`^\\s+- ${exception.advisoryId}$`, "m"));
    assert.ok(exception.reachability.length >= 40);
    assert.ok(exception.compensatingControls.length >= 2);
    assert.ok(exception.remediationGate.length >= 40);
  }
});

test("GitHub collaboration files cover departments, evidence and private security reporting", async () => {
  const [registry, departmentForm, pullRequest, security, workflow, dependabot, schema] = await Promise.all([
    readJson("governance/departments.json"),
    readText(".github/ISSUE_TEMPLATE/department-work.yml"),
    readText(".github/pull_request_template.md"),
    readText(".github/SECURITY.md"),
    readText(".github/workflows/ci.yml"),
    readText(".github/dependabot.yml"),
    readJson("governance/schemas/departments.schema.json"),
  ]);

  for (const department of registry.departments) {
    assert.match(departmentForm, new RegExp(`\\b${department.id}\\b`));
  }
  for (const section of ["Departments", "Lifecycle boundary", "Scientific and data evidence", "Security and privacy", "Verification", "Documentation, rollback and limitations"]) {
    assert.match(pullRequest, new RegExp(`^## ${section}$`, "m"));
  }
  assert.match(security, /Security Advisory/i);
  assert.match(workflow, /name: Governance registry/);
  assert.match(workflow, /name: Dependency security/);
  assert.match(workflow, /name: Typecheck and lint/);
  assert.match(workflow, /name: Scientific invariants/);
  assert.match(workflow, /name: Production build and smoke/);
  assert.match(dependabot, /package-ecosystem: npm/);
  assert.match(dependabot, /package-ecosystem: github-actions/);
  assert.equal(schema.title, "Solar Intelligence OS department registry");
});
