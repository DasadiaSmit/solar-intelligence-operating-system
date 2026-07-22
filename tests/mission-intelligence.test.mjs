import assert from "node:assert/strict";
import test from "node:test";

import {
  MISSION_INTELLIGENCE_VERSION,
  MISSION_SPECIALISTS,
  NO_SUPPORTING_EVIDENCE,
  SCIENTIFIC_MEMORY_VERSION,
  WORKSPACE_IDS,
  applyScientificMemoryEvent,
  assessMissionConfidence,
  compileMissionDossier,
  createScientificMemory,
  detectContinuityAlerts,
  openScientificInvestigation,
  parseScientificMemory,
  registerMissionArtifact,
  resolveScientificInvestigation,
  routeSpecialist,
  scientificMemoryStorageKey,
  serialiseScientificMemory,
  validateMissionEvidence,
} from "../lib/mission-intelligence/index.ts";
import { buildOperatingSnapshot } from "../lib/operating-snapshot.ts";
import { compactOperatingSnapshot } from "../lib/client-snapshot.ts";
import { deriveScenario, normalizeSnapshot } from "../components/solar-os/model.ts";
import { buildMissionContext, defaultSelectionForWorkspace, objectiveForWorkspace } from "../features/mission-intelligence/context-adapter.ts";

const GENERATED_AT = "2026-07-22T12:00:00.000Z";
const VALID_RANGE = ["2022-01-01T00:00:00.000Z", "2025-12-31T23:59:59.999Z"];

function evidenceRef(overrides = {}) {
  return {
    id: "evidence:annual-generation",
    resultId: "study:2022-2025",
    sourceType: "annual-study",
    sourceId: "study:2022-2025",
    factKey: "annual-generation-kwh",
    locator: "sios://study/study:2022-2025/annualEstimate/centralEstimateKWh",
    label: "Annual generation",
    domain: "forecasting",
    lifecycle: "experimental",
    dataClass: "reanalysis",
    provider: {
      id: "open-meteo",
      name: "Open-Meteo",
      product: "ERA5 archive",
      version: "archive-v1",
    },
    model: {
      id: "star-physics",
      name: "STAR physics reference",
      version: "sios-physics-1.0.0",
    },
    issueTimeUtc: null,
    validRangeUtc: VALID_RANGE,
    timestampUtc: null,
    resolution: "PT1H source / annual aggregation",
    unit: "kWh",
    quality: { score: 0.9, completeness: 1, flags: [] },
    provenance: {
      verified: true,
      snapshotIds: ["snapshot:2022", "snapshot:2023", "snapshot:2024", "snapshot:2025"],
      datasetVersion: "research-weather-v1",
      calculationVersion: "sios-physics-1.0.0",
      contentHash: "a".repeat(64),
    },
    ...overrides,
  };
}

function evidenceDatum(overrides = {}) {
  return {
    ref: evidenceRef(),
    value: 49_249,
    availability: "available",
    displayPrecision: 0,
    ...overrides,
  };
}

function objective(overrides = {}) {
  return {
    id: "objective:explain-annual-yield",
    intent: "explain-annual-yield",
    label: "Explain annual photovoltaic generation",
    requiredFactKeys: ["annual-generation-kwh"],
    preferredDomains: ["forecasting"],
    ...overrides,
  };
}

function context(overrides = {}) {
  return {
    contextId: "context:annual-forecast",
    projectId: "project:reference-site",
    workspaceId: "AF",
    selection: null,
    objective: objective(),
    linkedTimestampUtc: null,
    baseScenarioHash: "scenario:base",
    activeScenarioHash: "scenario:base",
    activeResultId: "study:2022-2025",
    activeStudyId: "study:2022-2025",
    activeModel: null,
    activeExperiment: null,
    currentDependencies: [],
    artifacts: [],
    capabilities: [
      "historical-years",
      "annual-uncertainty",
      "forecast-validation",
      "model-evidence",
      "provenance-lineage",
    ],
    evidence: {
      bundleId: "bundle:annual-forecast",
      resultIds: ["study:2022-2025"],
      evidence: [evidenceDatum()],
      assumptions: ["The configured array and loss model remain fixed across source years."],
      uncertainty: ["Annual Q10/Q90 values describe four-year interannual spread."],
      limitations: ["No measured inverter or meter production is attached."],
      warnings: [],
    },
    ...overrides,
  };
}

function selection(kind, workspaceId = "AF", evidenceRefIds = []) {
  return {
    kind,
    objectId: `object:${kind}`,
    label: kind,
    workspaceId,
    evidenceRefIds,
  };
}

function compile(value) {
  return compileMissionDossier(value, { generatedAtUtc: GENERATED_AT });
}

test("the federation contains exactly fourteen complete and uniquely identified specialists", () => {
  assert.equal(MISSION_SPECIALISTS.length, 14);
  assert.equal(new Set(MISSION_SPECIALISTS.map((specialist) => specialist.id)).size, 14);
  assert.equal(new Set(MISSION_SPECIALISTS.map((specialist) => specialist.domain)).size, 14);
  for (const specialist of MISSION_SPECIALISTS) {
    assert.ok(specialist.label.length > 3);
    assert.ok(specialist.vocabulary.length >= 5);
    assert.ok(specialist.tools.length >= 3);
    assert.ok(specialist.accessibleDomains.includes(specialist.domain));
    assert.ok(specialist.suggestedActionKinds.length >= 2);
  }
});

test("all fourteen workspaces route to their deterministic default specialist", () => {
  const expected = {
    DT: "pv-systems-engineer",
    AF: "forecast-scientist",
    WA: "meteorologist",
    ML: "machine-learning-researcher",
    RV: "validation-engineer",
    AE: "pv-systems-engineer",
    SR: "grid-engineer",
    BE: "battery-systems-engineer",
    RM: "climate-scientist",
    CL: "climate-scientist",
    FI: "financial-analyst",
    PA: "data-provenance-auditor",
    RP: "publication-assistant",
    MC: "research-methodology-specialist",
  };
  assert.deepEqual(WORKSPACE_IDS, Object.keys(expected));
  for (const workspaceId of WORKSPACE_IDS) {
    assert.equal(routeSpecialist(workspaceId).id, expected[workspaceId]);
  }
});

test("selected objects override workspace expertise without a manual specialist switch", () => {
  assert.equal(routeSpecialist("WA", selection("battery", "WA")).id, "battery-systems-engineer");
  assert.equal(routeSpecialist("BE", selection("cloud", "BE")).id, "meteorologist");
  assert.equal(routeSpecialist("FI", selection("solar-panel", "FI")).id, "pv-systems-engineer");
  assert.equal(routeSpecialist("AF", selection("uncertainty", "AF")).id, "validation-engineer");
  assert.equal(routeSpecialist("DT", selection("forecast-model", "DT")).id, "machine-learning-researcher");
  assert.equal(routeSpecialist("ML", selection("provenance-node", "ML")).id, "data-provenance-auditor");
  assert.equal(routeSpecialist("PA", selection("visualisation", "PA")).id, "scientific-visualisation-specialist");
  assert.equal(routeSpecialist("MC", selection("publication-artifact", "MC")).id, "publication-assistant");
});

test("the operating-state adapter compiles a grounded dossier from the real annual snapshot", () => {
  const base = normalizeSnapshot(compactOperatingSnapshot(buildOperatingSnapshot(), "sim_mission_adapter_fixture"));
  const result = deriveScenario(base, base.config);
  const missionContext = buildMissionContext({
    workspaceId: "AF",
    selection: defaultSelectionForWorkspace("AF"),
    objective: objectiveForWorkspace("AF"),
    base,
    result,
    scenario: base.config,
    selectedIndex: 171 * 24 + 12,
    artifacts: [],
  });
  const dossier = compileMissionDossier(missionContext, { generatedAtUtc: GENERATED_AT });
  assert.equal(dossier.activeSpecialist.id, "forecast-scientist");
  assert.notEqual(dossier.status, "unsupported");
  assert.ok(dossier.findings.some((finding) => finding.measurements.some((measurement) => measurement.factKey === "annual.generation")));
  assert.ok(dossier.supportingEvidence.every((reference) => reference.resultId === "sim_mission_adapter_fixture"));
  assert.ok(dossier.workflow.every((step) => step.status === "completed"));
});

test("a supported dossier preserves resolvable evidence IDs, canonical locators and numerical units", () => {
  const dossier = compile(context());
  assert.equal(dossier.version, MISSION_INTELLIGENCE_VERSION);
  assert.equal(dossier.status, "qualified");
  assert.equal(dossier.activeSpecialist.id, "forecast-scientist");
  assert.equal(dossier.findings.length, 1);
  const finding = dossier.findings[0];
  assert.equal(finding.kind, "measurement");
  assert.equal(finding.statement, "Annual generation: 49249 kWh.");
  assert.deepEqual(finding.evidenceRefIds, ["evidence:annual-generation"]);
  assert.deepEqual(finding.measurements, [{
    evidenceRefId: "evidence:annual-generation",
    factKey: "annual-generation-kwh",
    value: 49_249,
    unit: "kWh",
  }]);
  assert.equal(dossier.supportingEvidence[0].id, finding.measurements[0].evidenceRefId);
  assert.match(dossier.supportingEvidence[0].locator, /^sios:\/\/study\//);
  assert.equal(dossier.supportingEvidence[0].resultId, "study:2022-2025");
  assert.ok(dossier.workflow.every((step) => step.status === "completed"));
  assert.ok(dossier.workflow.some((step) => step.toolId === "inspect-forecast-evidence"));
  assert.equal(dossier.guaranteeNotice, "Scientific evidence and simulations remain uncertain; production is not guaranteed.");
});

test("missing, stale, planned and unitless numerical evidence fail closed", async (t) => {
  const cases = [
    {
      label: "missing",
      evidence: [],
      rejection: null,
    },
    {
      label: "stale",
      evidence: [evidenceDatum({ availability: "stale" })],
      rejection: /availability is stale/i,
    },
    {
      label: "planned",
      evidence: [evidenceDatum({ ref: evidenceRef({ lifecycle: "planned" }) })],
      rejection: /planned evidence cannot support/i,
    },
    {
      label: "unitless",
      evidence: [evidenceDatum({ ref: evidenceRef({ unit: null }) })],
      rejection: /no declared unit/i,
    },
  ];
  for (const item of cases) {
    await t.test(item.label, () => {
      const missionContext = context({
        evidence: { ...context().evidence, evidence: item.evidence },
      });
      const validation = validateMissionEvidence(missionContext);
      const dossier = compile(missionContext);
      assert.equal(dossier.status, "unsupported");
      assert.equal(dossier.findings[0].statement, NO_SUPPORTING_EVIDENCE);
      assert.deepEqual(dossier.supportingEvidence, []);
      assert.equal(dossier.confidence.evidenceSupportScore, null);
      if (item.rejection) {
        assert.ok(validation.rejected.some((entry) => item.rejection.test(entry.reason)));
      }
    });
  }
});

test("duplicate evidence-reference IDs are rejected rather than ambiguously resolved", () => {
  const duplicate = evidenceDatum();
  const missionContext = context({
    evidence: { ...context().evidence, evidence: [duplicate, { ...duplicate }] },
  });
  const validation = validateMissionEvidence(missionContext);
  assert.equal(validation.valid.length, 0);
  assert.equal(validation.rejected.length, 2);
  assert.ok(validation.rejected.every((entry) => /duplicated/i.test(entry.reason)));
  const dossier = compile(missionContext);
  assert.equal(dossier.status, "unsupported");
  assert.equal(dossier.findings[0].statement, "No supporting evidence currently exists.");
});

test("the unsupported fallback phrase is exact and never softened into an invented answer", () => {
  assert.equal(NO_SUPPORTING_EVIDENCE, "No supporting evidence currently exists.");
  const dossier = compile(context({
    objective: objective({ requiredFactKeys: ["measured-production-kwh"] }),
  }));
  assert.equal(dossier.status, "unsupported");
  assert.deepEqual(dossier.findings.map((finding) => finding.statement), [NO_SUPPORTING_EVIDENCE]);
  assert.ok(dossier.workflow.some(
    (step) => step.operation === "validate-evidence" && step.status === "blocked",
  ));
  assert.ok(dossier.workflow.some(
    (step) => step.operation === "compile-dossier" && step.detail === NO_SUPPORTING_EVIDENCE,
  ));
});

test("confidence reports measured evidence dimensions and explicitly is not an AI probability", () => {
  const timestamp = "2024-07-01T12:00:00.000Z";
  const datum = evidenceDatum({
    ref: evidenceRef({
      timestampUtc: timestamp,
      validRangeUtc: null,
      quality: { score: 0.8, completeness: 0.9, flags: [] },
    }),
  });
  const confidence = assessMissionConfidence([datum], timestamp);
  assert.equal(confidence.method, "equal-mean-of-available-evidence-dimensions");
  assert.equal(confidence.notice, "Evidence-support score, not a probability of correctness or guaranteed outcome.");
  assert.equal(confidence.dimensions.length, 4);
  assert.deepEqual(
    Object.fromEntries(confidence.dimensions.map((dimension) => [dimension.id, dimension.score])),
    {
      "data-quality": 0.8,
      completeness: 0.9,
      "provenance-coverage": 1,
      "temporal-alignment": 1,
    },
  );
  assert.equal(confidence.evidenceSupportScore, 0.925);
  assert.doesNotMatch(confidence.notice, /AI confidence|model confidence/i);

  const noInventedTemporalScore = assessMissionConfidence([evidenceDatum()], null);
  assert.equal(
    noInventedTemporalScore.dimensions.find((dimension) => dimension.id === "temporal-alignment").score,
    null,
  );
});

test("artifact dependency changes generate explicit scientific-continuity warnings", () => {
  const artifact = {
    id: "artifact:battery-optimisation",
    kind: "optimisation-run",
    label: "Battery optimisation",
    lifecycle: "experimental",
    resultId: "optimisation:1",
    evidenceRefIds: ["evidence:annual-generation"],
    registeredAtUtc: GENERATED_AT,
    dependencies: [
      { key: "panel-tilt", label: "panel tilt", valueHash: "tilt:35" },
      { key: "battery-capacity", label: "battery capacity", valueHash: "battery:20" },
    ],
  };
  const unchanged = detectContinuityAlerts(artifact ? [artifact] : [], [
    { key: "panel-tilt", label: "panel tilt", valueHash: "tilt:35" },
    { key: "battery-capacity", label: "battery capacity", valueHash: "battery:20" },
  ]);
  assert.deepEqual(unchanged, []);

  const alerts = detectContinuityAlerts([artifact], [
    { key: "panel-tilt", label: "panel tilt", valueHash: "tilt:37" },
    { key: "battery-capacity", label: "battery capacity", valueHash: "battery:20" },
  ]);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].artifactId, artifact.id);
  assert.deepEqual(alerts[0].changedDependencies.map((item) => item.key), ["panel-tilt"]);
  assert.match(alerts[0].message, /uses earlier panel tilt state/i);
  assert.match(alerts[0].message, /recompute before comparison/i);

  const dossier = compile(context({
    artifacts: [artifact],
    currentDependencies: [
      { key: "panel-tilt", label: "panel tilt", valueHash: "tilt:37" },
      { key: "battery-capacity", label: "battery capacity", valueHash: "battery:20" },
    ],
    capabilities: [...context().capabilities, "authoritative-recalculation"],
  }));
  assert.equal(dossier.continuityAlerts.length, 1);
  assert.ok(dossier.suggestions.some(
    (item) => item.kind === "resolve-stale-artifact" && item.availability === "available",
  ));
});

test("device scientific memory round-trips project state without conversation or message fields", () => {
  let memory = createScientificMemory("project:reference-site", GENERATED_AT);
  assert.equal(memory.schemaVersion, SCIENTIFIC_MEMORY_VERSION);
  assert.match(scientificMemoryStorageKey(memory.projectId), /^sios\.mission-memory\./);

  memory = applyScientificMemoryEvent(memory, {
    id: "event:scenario",
    kind: "scenario-revised",
    occurredAtUtc: "2026-07-22T12:01:00.000Z",
    label: "Panel tilt revised",
    entityId: "scenario:branch-1",
    beforeHash: "scenario:base",
    afterHash: "scenario:tilt-37",
    evidenceRefIds: [],
    detail: { field: "tiltDeg", before: 35, after: 37 },
  });
  memory = applyScientificMemoryEvent(memory, {
    id: "event:dataset",
    kind: "dataset-selected",
    occurredAtUtc: "2026-07-22T12:02:00.000Z",
    label: "ERA5 archive selected",
    entityId: "dataset:era5",
    beforeHash: null,
    afterHash: "dataset:era5",
    evidenceRefIds: ["evidence:annual-generation"],
    detail: { datasetId: "dataset:era5" },
  });
  memory = applyScientificMemoryEvent(memory, {
    id: "event:model",
    kind: "model-selected",
    occurredAtUtc: "2026-07-22T12:03:00.000Z",
    label: "Hybrid model selected",
    entityId: "model:hybrid",
    beforeHash: null,
    afterHash: "model:hybrid-v1",
    evidenceRefIds: [],
    detail: { modelId: "model:hybrid" },
  });
  memory = applyScientificMemoryEvent(memory, {
    id: "event:assumption",
    kind: "assumption-recorded",
    occurredAtUtc: "2026-07-22T12:04:00.000Z",
    label: "Loss assumption",
    entityId: "assumption:loss",
    beforeHash: null,
    afterHash: "assumption:loss-v1",
    evidenceRefIds: [],
    detail: { assumption: "System-loss inputs remain fixed across historical years." },
  });

  const artifact = {
    id: "artifact:annual-study",
    kind: "annual-study",
    label: "Annual research study",
    lifecycle: "experimental",
    resultId: "study:2022-2025",
    evidenceRefIds: ["evidence:annual-generation"],
    dependencies: [{ key: "panel-tilt", label: "panel tilt", valueHash: "tilt:37" }],
    registeredAtUtc: "2026-07-22T12:05:00.000Z",
  };
  memory = registerMissionArtifact(memory, artifact, "event:artifact");
  const investigation = {
    id: "investigation:july",
    objective: objective({
      id: "objective:july-anomaly",
      intent: "investigate-anomaly",
      label: "Investigate July generation",
    }),
    status: "open",
    openedAtUtc: "2026-07-22T12:06:00.000Z",
    resolvedAtUtc: null,
    evidenceRefIds: ["evidence:annual-generation"],
    unresolvedQuestions: ["Does the weather evidence support a July anomaly?"],
  };
  memory = openScientificInvestigation(memory, investigation, "event:investigation-open");
  memory = resolveScientificInvestigation(
    memory,
    investigation.id,
    "2026-07-22T12:07:00.000Z",
    "event:investigation-resolved",
  );

  const serialised = serialiseScientificMemory(memory);
  const restored = parseScientificMemory(serialised, memory.projectId);
  assert.deepEqual(restored, memory);
  assert.equal(restored.scenarioHash, "scenario:tilt-37");
  assert.deepEqual(restored.selectedDatasetIds, ["dataset:era5"]);
  assert.equal(restored.selectedModelId, "model:hybrid");
  assert.equal(restored.artifacts[0].id, artifact.id);
  assert.equal(restored.investigations[0].status, "resolved");
  assert.ok(restored.revision >= 7);

  const keys = [];
  const collectKeys = (value) => {
    if (!value || typeof value !== "object") return;
    for (const [key, nested] of Object.entries(value)) {
      keys.push(key);
      collectKeys(nested);
    }
  };
  collectKeys(restored);
  assert.equal(keys.includes("conversation"), false);
  assert.equal(keys.includes("conversations"), false);
  assert.equal(keys.includes("message"), false);
  assert.equal(keys.includes("messages"), false);
  assert.equal(parseScientificMemory(serialised, "project:another-site"), null);
  assert.equal(parseScientificMemory("{invalid", memory.projectId), null);
});
