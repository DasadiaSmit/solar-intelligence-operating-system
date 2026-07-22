import { assessMissionConfidence } from "./confidence";
import {
  MISSION_INTELLIGENCE_VERSION,
  NO_SUPPORTING_EVIDENCE,
  type EvidenceDatumV1,
  type EvidenceDomain,
  type MissionCapability,
  type MissionContextV1,
  type MissionDossierV1,
  type MissionFindingV1,
  type MissionSpecialistDefinition,
  type MissionSuggestionKind,
  type MissionSuggestionV1,
  type MissionToolId,
  type MissionWorkflowStepV1,
  type WorkspaceId,
} from "./contracts";
import { detectContinuityAlerts } from "./memory";
import { collaboratingSpecialists, routeSpecialist, specialistForDomain } from "./specialists";

export interface CompileMissionDossierOptions {
  /** Caller-supplied clock value keeps replay and tests deterministic. */
  generatedAtUtc: string;
}

export interface EvidenceValidationV1 {
  valid: EvidenceDatumV1[];
  rejected: Array<{ evidenceRefId: string; reason: string }>;
  missingRequiredFactKeys: string[];
  missingSelectedEvidenceRefIds: string[];
}

const DOMAIN_TOOL: Readonly<Record<EvidenceDomain, MissionToolId>> = {
  meteorology: "inspect-weather-evidence",
  "solar-physics": "inspect-solar-evidence",
  "pv-system": "inspect-pv-system-evidence",
  forecasting: "inspect-forecast-evidence",
  "machine-learning": "inspect-model-evidence",
  battery: "inspect-battery-evidence",
  grid: "inspect-grid-evidence",
  finance: "inspect-financial-evidence",
  climate: "inspect-climate-evidence",
  provenance: "trace-provenance",
  "research-methodology": "inspect-research-method",
  visualisation: "inspect-visual-encoding",
  publication: "prepare-publication-evidence",
  validation: "validate-evidence",
};

function nonEmpty(value: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function evidenceRejection(datum: EvidenceDatumV1): string | null {
  if (datum.availability !== "available") return `Evidence availability is ${datum.availability}.`;
  if (!nonEmpty(datum.ref.id)) return "Evidence reference ID is missing.";
  if (!nonEmpty(datum.ref.resultId)) return "Immutable result ID is missing.";
  if (!nonEmpty(datum.ref.factKey)) return "Registered fact key is missing.";
  if (!nonEmpty(datum.ref.locator)) return "Resolvable evidence locator is missing.";
  if (!nonEmpty(datum.ref.sourceId)) return "Evidence source ID is missing.";
  if (!nonEmpty(datum.ref.provider.id) || !nonEmpty(datum.ref.provider.name)) {
    return "Provider identity is incomplete.";
  }
  if (datum.ref.lifecycle === "planned") return "Planned evidence cannot support a scientific finding.";
  if (typeof datum.value === "number") {
    if (!Number.isFinite(datum.value)) return "Numerical evidence is not finite.";
    if (!nonEmpty(datum.ref.unit)) return "Numerical evidence has no declared unit.";
  }
  return null;
}

function relevantEvidence(context: MissionContextV1, valid: readonly EvidenceDatumV1[]): EvidenceDatumV1[] {
  const selected = new Set(context.selection?.evidenceRefIds ?? []);
  const required = new Set(context.objective.requiredFactKeys);
  const preferred = new Set(context.objective.preferredDomains);
  const filtered = valid.filter((datum) =>
    selected.has(datum.ref.id) || required.has(datum.ref.factKey) || preferred.has(datum.ref.domain));
  const candidates = filtered.length || selected.size || required.size || preferred.size ? filtered : [...valid];
  const seen = new Set<string>();
  return candidates.filter((datum) => {
    if (seen.has(datum.ref.id)) return false;
    seen.add(datum.ref.id);
    return true;
  });
}

export function validateMissionEvidence(context: MissionContextV1): EvidenceValidationV1 {
  const duplicateIds = new Set<string>();
  const seen = new Set<string>();
  for (const datum of context.evidence.evidence) {
    if (seen.has(datum.ref.id)) duplicateIds.add(datum.ref.id);
    seen.add(datum.ref.id);
  }
  const rejected: EvidenceValidationV1["rejected"] = [];
  const valid = context.evidence.evidence.filter((datum) => {
    if (duplicateIds.has(datum.ref.id)) {
      rejected.push({ evidenceRefId: datum.ref.id, reason: "Evidence reference ID is duplicated." });
      return false;
    }
    const reason = evidenceRejection(datum);
    if (reason) {
      rejected.push({ evidenceRefId: datum.ref.id, reason });
      return false;
    }
    return true;
  });
  const validFactKeys = new Set(valid.map((datum) => datum.ref.factKey));
  const validRefIds = new Set(valid.map((datum) => datum.ref.id));
  return {
    valid,
    rejected,
    missingRequiredFactKeys: context.objective.requiredFactKeys.filter((key) => !validFactKeys.has(key)),
    missingSelectedEvidenceRefIds: (context.selection?.evidenceRefIds ?? []).filter(
      (id) => !validRefIds.has(id),
    ),
  };
}

function formatValue(value: number, precision = 3): string {
  const factor = 10 ** Math.max(0, Math.min(8, precision));
  return String(Math.round(value * factor) / factor);
}

function findingFor(datum: EvidenceDatumV1, index: number): MissionFindingV1 {
  if (typeof datum.value === "number") {
    const unit = datum.ref.unit as string;
    const value = formatValue(datum.value, datum.displayPrecision ?? 3);
    return {
      id: `finding:${index}:${datum.ref.id}`,
      kind: "measurement",
      statement: `${datum.ref.label}: ${value} ${unit}.`,
      measurements: [{
        evidenceRefId: datum.ref.id,
        factKey: datum.ref.factKey,
        value: datum.value,
        unit,
      }],
      evidenceRefIds: [datum.ref.id],
    };
  }
  return {
    id: `finding:${index}:${datum.ref.id}`,
    kind: "evidence-statement",
    statement: `${datum.ref.label}: ${typeof datum.value === "boolean" ? (datum.value ? "yes" : "no") : datum.value}.`,
    measurements: [],
    evidenceRefIds: [datum.ref.id],
  };
}

function workflowStep(
  sequence: number,
  operation: MissionWorkflowStepV1["operation"],
  label: string,
  active: MissionSpecialistDefinition,
  status: MissionWorkflowStepV1["status"],
  detail: string,
  inputEvidenceRefIds: readonly string[] = [],
  outputIds: readonly string[] = [],
  toolId: MissionToolId | null = null,
): MissionWorkflowStepV1 {
  return {
    id: `workflow:${sequence}:${operation}`,
    sequence,
    label,
    operation,
    specialistId: active.id,
    toolId,
    status,
    detail,
    inputEvidenceRefIds,
    outputIds,
  };
}

interface SuggestionDefinition {
  kind: MissionSuggestionKind;
  label: string;
  rationale: string;
  capabilities: readonly MissionCapability[];
  target: WorkspaceId;
}

function suggestion(
  definition: SuggestionDefinition,
  context: MissionContextV1,
  evidenceRefIds: readonly string[],
): MissionSuggestionV1 {
  const available = definition.capabilities.every((capability) => context.capabilities.includes(capability));
  return {
    id: `suggestion:${definition.kind}`,
    kind: definition.kind,
    label: definition.label,
    rationale: available
      ? definition.rationale
      : `${definition.rationale} Required evidence capability is not currently loaded.`,
    availability: available ? "available" : "blocked",
    requiredCapabilities: definition.capabilities,
    evidenceRefIds,
    targetWorkspaceId: definition.target,
    mutatesScientificState: false,
    requiresConfirmation: false,
  };
}

function compileSuggestions(
  context: MissionContextV1,
  active: MissionSpecialistDefinition,
  evidence: readonly EvidenceDatumV1[],
  hasContinuityAlerts: boolean,
): MissionSuggestionV1[] {
  const evidenceRefIds = evidence.map((datum) => datum.ref.id);
  const definitions: SuggestionDefinition[] = [];
  if (context.workspaceId === "AF" || context.workspaceId === "WA" || context.workspaceId === "CL") {
    definitions.push({
      kind: "compare-historical-years",
      label: "Compare against 2022–2025",
      rationale: "Test whether the current pattern persists across the loaded source years.",
      capabilities: ["historical-years"],
      target: "AF",
    });
  }
  if (active.id === "meteorologist" || active.id === "solar-physicist") {
    definitions.push({
      kind: "inspect-cloud-anomaly",
      label: "Inspect the linked cloud and irradiance evidence",
      rationale: "Review coincident meteorological and irradiance measurements without inferring unsupported causality.",
      capabilities: ["hourly-weather", "hourly-solar"],
      target: "WA",
    });
  }
  if (context.capabilities.includes("annual-uncertainty") || active.id === "validation-engineer") {
    definitions.push({
      kind: "inspect-uncertainty",
      label: "Investigate uncertainty construction",
      rationale: "Inspect the stated bounds, method, sample size, and limitations.",
      capabilities: ["annual-uncertainty"],
      target: "AF",
    });
  }
  if (["AF", "ML", "RV"].includes(context.workspaceId) || context.activeModel) {
    definitions.push({
      kind: "review-model-evidence",
      label: "Review model validation evidence",
      rationale: "Check chronological splits, metrics, calibration, and model lifecycle.",
      capabilities: ["model-evidence", "forecast-validation"],
      target: "ML",
    });
  }
  if (active.id === "battery-systems-engineer") {
    definitions.push({
      kind: "review-battery-dispatch",
      label: "Review linked battery dispatch",
      rationale: "Inspect state of charge, charge/discharge limits, and grid interaction.",
      capabilities: ["battery-dispatch"],
      target: "BE",
    });
  }
  if (active.id === "grid-engineer" || active.id === "battery-systems-engineer") {
    definitions.push({
      kind: "review-grid-flow",
      label: "Review grid import and export",
      rationale: "Check the linked energy-balance evidence and declared constraints.",
      capabilities: ["grid-flow"],
      target: "BE",
    });
  }
  if (active.id === "financial-analyst") {
    definitions.push({
      kind: "review-financial-assumptions",
      label: "Review tariff and value assumptions",
      rationale: "Separate energy-value screening from complete investment analysis.",
      capabilities: ["financial-screening"],
      target: "FI",
    });
  }
  if (hasContinuityAlerts || context.activeScenarioHash !== context.baseScenarioHash) {
    definitions.push({
      kind: "resolve-stale-artifact",
      label: "Recompute affected scientific artifacts",
      rationale: "Current state differs from recorded artifact inputs.",
      capabilities: ["authoritative-recalculation"],
      target: context.workspaceId,
    });
  }
  if (evidence.length) {
    definitions.push({
      kind: "trace-provenance",
      label: "Trace supporting evidence",
      rationale: "Inspect provider, data class, versions, transformations, and content identity.",
      capabilities: ["provenance-lineage"],
      target: "PA",
    });
  }
  if (context.workspaceId === "RP" || context.objective.intent === "prepare-publication-evidence") {
    definitions.push({
      kind: "open-publication-workspace",
      label: "Prepare a publication evidence package",
      rationale: "Carry the selected measurements, method, and provenance into an export workflow.",
      capabilities: ["publication-export"],
      target: "RP",
    });
  }
  const seen = new Set<MissionSuggestionKind>();
  return definitions
    .filter((definition) => !seen.has(definition.kind) && Boolean(seen.add(definition.kind)))
    .map((definition) => suggestion(definition, context, evidenceRefIds));
}

function qualifiedEvidence(evidence: readonly EvidenceDatumV1[], context: MissionContextV1): boolean {
  return evidence.some((datum) =>
    datum.ref.lifecycle !== "implemented" ||
    datum.ref.dataClass === "simulation" ||
    datum.ref.dataClass === "unknown" ||
    !datum.ref.provenance.verified) ||
    context.evidence.limitations.length > 0 ||
    context.evidence.warnings.length > 0;
}

function extractionWorkflow(
  evidence: readonly EvidenceDatumV1[],
  active: MissionSpecialistDefinition,
  blocked: boolean,
): MissionWorkflowStepV1[] {
  if (blocked) {
    return [workflowStep(
      4,
      "extract-measurements",
      "Extract referenced measurements",
      active,
      "blocked",
      NO_SUPPORTING_EVIDENCE,
      [],
      [],
      DOMAIN_TOOL[active.domain],
    )];
  }
  const domains = [...new Set(evidence.map((datum) => datum.ref.domain))];
  return domains.map((domain, index) => {
    const domainEvidence = evidence.filter((datum) => datum.ref.domain === domain);
    const specialist = specialistForDomain(domain);
    const numericalCount = domainEvidence.filter((datum) => typeof datum.value === "number").length;
    return workflowStep(
      4 + index,
      "extract-measurements",
      `Inspect ${domain.replace(/-/g, " ")} evidence`,
      specialist,
      "completed",
      `${specialist.label} inspected ${domainEvidence.length} referenced fact${domainEvidence.length === 1 ? "" : "s"}; ${numericalCount} retained as unit-bearing measurement${numericalCount === 1 ? "" : "s"}.`,
      domainEvidence.map((datum) => datum.ref.id),
      domainEvidence.map((datum) => `finding:${evidence.indexOf(datum)}:${datum.ref.id}`),
      DOMAIN_TOOL[domain],
    );
  });
}

/**
 * Compiles a deterministic, evidence-gated mission dossier. Statements are
 * direct renderings of supplied facts; this function performs no language-model
 * inference and no state mutation.
 */
export function compileMissionDossier(
  context: MissionContextV1,
  options: CompileMissionDossierOptions,
): MissionDossierV1 {
  const active = routeSpecialist(context.workspaceId, context.selection);
  const validation = validateMissionEvidence(context);
  const relevant = relevantEvidence(context, validation.valid);
  const missingGate = validation.missingRequiredFactKeys.length > 0 ||
    validation.missingSelectedEvidenceRefIds.length > 0 ||
    relevant.length === 0;
  const confidence = assessMissionConfidence(missingGate ? [] : relevant, context.linkedTimestampUtc);
  const continuityAlerts = detectContinuityAlerts(context.artifacts, context.currentDependencies);
  const findings = missingGate
    ? [{
        id: "finding:unsupported",
        kind: "limitation" as const,
        statement: NO_SUPPORTING_EVIDENCE,
        measurements: [],
        evidenceRefIds: [],
      }]
    : relevant.map(findingFor);
  const referenceIds = relevant.map((datum) => datum.ref.id);
  const findingIds = findings.map((finding) => finding.id);
  const rejectedWarnings = validation.rejected.map(
    (item) => `${item.evidenceRefId || "unidentified evidence"}: ${item.reason}`,
  );
  const gateDetails = [
    ...validation.missingRequiredFactKeys.map((key) => `required fact ${key}`),
    ...validation.missingSelectedEvidenceRefIds.map((id) => `selected evidence ${id}`),
  ];
  const extractionSteps = extractionWorkflow(relevant, active, missingGate);
  const supportSequence = 4 + extractionSteps.length;
  const workflow: MissionWorkflowStepV1[] = [
    workflowStep(1, "resolve-context", "Resolve linked mission context", active, "completed", `Workspace ${context.workspaceId}; objective ${context.objective.intent}.`),
    workflowStep(2, "route-specialist", "Activate domain specialist", active, "completed", `${active.label} activated by ${context.selection ? `${context.selection.kind} selection` : "workspace routing"}.`),
    workflowStep(
      3,
      "validate-evidence",
      "Verify evidence eligibility",
      active,
      missingGate ? "blocked" : "completed",
      missingGate
        ? `Evidence gate failed${gateDetails.length ? `: ${gateDetails.join(", ")}.` : "."}`
        : `${relevant.length} unique, available, resolvable evidence reference${relevant.length === 1 ? "" : "s"} passed.`,
      context.evidence.evidence.map((datum) => datum.ref.id),
      referenceIds,
      "validate-evidence",
    ),
    ...extractionSteps,
    workflowStep(
      supportSequence,
      "assess-evidence-support",
      "Assess evidence support",
      active,
      missingGate ? "skipped" : "completed",
      missingGate ? "Evidence support was not scored because the evidence gate failed." : confidence.notice,
      referenceIds,
      confidence.dimensions.map((item) => `confidence:${item.id}`),
      "validate-evidence",
    ),
    workflowStep(
      supportSequence + 1,
      "check-continuity",
      "Check scientific continuity",
      active,
      "completed",
      continuityAlerts.length ? `${continuityAlerts.length} stale artifact warning${continuityAlerts.length === 1 ? "" : "s"} identified.` : "Registered artifact inputs match current dependency fingerprints.",
      context.artifacts.flatMap((artifact) => artifact.evidenceRefIds),
      continuityAlerts.map((alert) => alert.id),
      "check-artifact-consistency",
    ),
    workflowStep(
      supportSequence + 2,
      "compile-dossier",
      "Compile scientific mission dossier",
      active,
      missingGate ? "blocked" : "completed",
      missingGate ? NO_SUPPORTING_EVIDENCE : "Findings retain exact evidence references, units, assumptions, uncertainty, and limitations.",
      referenceIds,
      findingIds,
    ),
  ];

  return {
    id: `mission:${context.contextId}:${context.objective.id}`,
    version: MISSION_INTELLIGENCE_VERSION,
    status: missingGate ? "unsupported" : qualifiedEvidence(relevant, context) ? "qualified" : "ready",
    generatedAtUtc: options.generatedAtUtc,
    contextId: context.contextId,
    objective: context.objective,
    operatingContext: {
      workspaceId: context.workspaceId,
      linkedTimestampUtc: context.linkedTimestampUtc,
      activeResultId: context.activeResultId,
      activeStudyId: context.activeStudyId,
      activeModel: context.activeModel,
      activeExperiment: context.activeExperiment,
      datasetSnapshotIds: [...new Set(context.evidence.evidence.flatMap((datum) => datum.ref.provenance.snapshotIds))],
      baseScenarioHash: context.baseScenarioHash,
      activeScenarioHash: context.activeScenarioHash,
    },
    activeSpecialist: active,
    collaboratingSpecialists: collaboratingSpecialists(context, active, relevant),
    selection: context.selection,
    workflow,
    findings,
    supportingEvidence: missingGate ? [] : relevant.map((datum) => datum.ref),
    confidence,
    assumptions: [...new Set(context.evidence.assumptions)],
    uncertainty: [...new Set(context.evidence.uncertainty)],
    limitations: [
      ...new Set([
        ...context.evidence.limitations,
        ...(missingGate ? [NO_SUPPORTING_EVIDENCE] : []),
      ]),
    ],
    warnings: [...new Set([...context.evidence.warnings, ...rejectedWarnings])],
    suggestions: compileSuggestions(context, active, relevant, continuityAlerts.length > 0),
    continuityAlerts,
    guaranteeNotice: "Scientific evidence and simulations remain uncertain; production is not guaranteed.",
  };
}
