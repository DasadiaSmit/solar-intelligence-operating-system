import type {
  EvidenceDatumV1,
  EvidenceDomain,
  MissionContextV1,
  MissionObjectKind,
  MissionSpecialistDefinition,
  SpecialistId,
  WorkspaceId,
} from "./contracts";

export const MISSION_SPECIALISTS = [
  {
    id: "meteorologist",
    label: "Meteorologist",
    domain: "meteorology",
    vocabulary: ["cloud cover", "irradiance", "weather regime", "reanalysis", "ensemble"],
    tools: ["summarise-linked-evidence", "inspect-weather-evidence", "trace-provenance", "validate-evidence"],
    accessibleDomains: ["meteorology", "solar-physics", "provenance", "validation"],
    suggestedActionKinds: ["inspect-cloud-anomaly", "compare-historical-years", "trace-provenance"],
  },
  {
    id: "solar-physicist",
    label: "Solar Physicist",
    domain: "solar-physics",
    vocabulary: ["solar position", "irradiance components", "plane of array", "transposition", "temperature loss"],
    tools: ["summarise-linked-evidence", "inspect-solar-evidence", "inspect-weather-evidence", "validate-evidence"],
    accessibleDomains: ["solar-physics", "meteorology", "pv-system", "validation"],
    suggestedActionKinds: ["inspect-cloud-anomaly", "inspect-uncertainty", "request-authoritative-recalculation"],
  },
  {
    id: "pv-systems-engineer",
    label: "PV Systems Engineer",
    domain: "pv-system",
    vocabulary: ["array", "inverter", "DC/AC ratio", "mismatch", "electrical loss"],
    tools: ["summarise-linked-evidence", "inspect-pv-system-evidence", "inspect-solar-evidence", "check-artifact-consistency"],
    accessibleDomains: ["pv-system", "solar-physics", "battery", "grid", "provenance"],
    suggestedActionKinds: ["request-authoritative-recalculation", "trace-provenance", "resolve-stale-artifact"],
  },
  {
    id: "forecast-scientist",
    label: "Forecast Scientist",
    domain: "forecasting",
    vocabulary: ["horizon", "interval", "calibration", "seasonal error", "hindcast"],
    tools: ["summarise-linked-evidence", "inspect-forecast-evidence", "inspect-model-evidence", "validate-evidence", "check-artifact-consistency"],
    accessibleDomains: ["forecasting", "machine-learning", "meteorology", "validation", "provenance"],
    suggestedActionKinds: ["compare-historical-years", "inspect-uncertainty", "review-model-evidence", "validate-representative-year"],
  },
  {
    id: "machine-learning-researcher",
    label: "Machine Learning Researcher",
    domain: "machine-learning",
    vocabulary: ["feature schema", "hyperparameter", "holdout", "drift", "champion/challenger"],
    tools: ["inspect-model-evidence", "inspect-forecast-evidence", "validate-evidence", "trace-provenance"],
    accessibleDomains: ["machine-learning", "forecasting", "validation", "provenance", "research-methodology"],
    suggestedActionKinds: ["review-model-evidence", "inspect-uncertainty", "trace-provenance"],
  },
  {
    id: "battery-systems-engineer",
    label: "Battery Systems Engineer",
    domain: "battery",
    vocabulary: ["state of charge", "dispatch", "cycle", "charge limit", "degradation"],
    tools: ["summarise-linked-evidence", "inspect-battery-evidence", "inspect-grid-evidence", "check-artifact-consistency"],
    accessibleDomains: ["battery", "grid", "pv-system", "finance", "validation"],
    suggestedActionKinds: ["review-battery-dispatch", "review-grid-flow", "resolve-stale-artifact"],
  },
  {
    id: "grid-engineer",
    label: "Grid Engineer",
    domain: "grid",
    vocabulary: ["import", "export", "curtailment", "reliability", "grid constraint"],
    tools: ["summarise-linked-evidence", "inspect-grid-evidence", "inspect-battery-evidence", "validate-evidence"],
    accessibleDomains: ["grid", "battery", "pv-system", "finance", "validation"],
    suggestedActionKinds: ["review-grid-flow", "review-battery-dispatch", "request-authoritative-recalculation"],
  },
  {
    id: "financial-analyst",
    label: "Financial Analyst",
    domain: "finance",
    vocabulary: ["tariff", "cash flow", "payback", "NPV", "uncertainty-adjusted value"],
    tools: ["inspect-financial-evidence", "inspect-grid-evidence", "validate-evidence", "trace-provenance"],
    accessibleDomains: ["finance", "grid", "battery", "forecasting", "validation", "provenance"],
    suggestedActionKinds: ["review-financial-assumptions", "inspect-uncertainty", "trace-provenance"],
  },
  {
    id: "climate-scientist",
    label: "Climate Scientist",
    domain: "climate",
    vocabulary: ["interannual variability", "weather normalisation", "climate scenario", "regime", "long horizon"],
    tools: ["inspect-climate-evidence", "inspect-weather-evidence", "trace-provenance", "validate-evidence"],
    accessibleDomains: ["climate", "meteorology", "forecasting", "provenance", "validation"],
    suggestedActionKinds: ["compare-historical-years", "inspect-uncertainty", "trace-provenance"],
  },
  {
    id: "data-provenance-auditor",
    label: "Data Provenance Auditor",
    domain: "provenance",
    vocabulary: ["lineage", "snapshot", "content hash", "data class", "transformation"],
    tools: ["trace-provenance", "validate-evidence", "check-artifact-consistency"],
    accessibleDomains: ["provenance", "validation", "research-methodology"],
    suggestedActionKinds: ["trace-provenance", "resolve-stale-artifact"],
  },
  {
    id: "research-methodology-specialist",
    label: "Research Methodology Specialist",
    domain: "research-methodology",
    vocabulary: ["research question", "assumption", "method", "limitation", "reproducibility"],
    tools: ["inspect-research-method", "validate-evidence", "trace-provenance", "check-artifact-consistency"],
    accessibleDomains: ["research-methodology", "validation", "provenance", "forecasting"],
    suggestedActionKinds: ["validate-representative-year", "trace-provenance", "open-publication-workspace"],
  },
  {
    id: "scientific-visualisation-specialist",
    label: "Scientific Visualisation Specialist",
    domain: "visualisation",
    vocabulary: ["encoding", "scale", "linked view", "uncertainty band", "accessibility"],
    tools: ["inspect-visual-encoding", "validate-evidence", "trace-provenance"],
    accessibleDomains: ["visualisation", "validation", "provenance", "publication"],
    suggestedActionKinds: ["inspect-uncertainty", "trace-provenance", "open-publication-workspace"],
  },
  {
    id: "publication-assistant",
    label: "Publication Assistant",
    domain: "publication",
    vocabulary: ["figure", "caption", "methods", "dataset citation", "reproducible export"],
    tools: ["prepare-publication-evidence", "inspect-research-method", "trace-provenance", "validate-evidence"],
    accessibleDomains: ["publication", "research-methodology", "visualisation", "provenance", "validation"],
    suggestedActionKinds: ["open-publication-workspace", "trace-provenance", "validate-representative-year"],
  },
  {
    id: "validation-engineer",
    label: "Validation Engineer",
    domain: "validation",
    vocabulary: ["MAE", "RMSE", "bias", "coverage", "independent holdout"],
    tools: ["validate-evidence", "inspect-forecast-evidence", "inspect-model-evidence", "trace-provenance"],
    accessibleDomains: ["validation", "forecasting", "machine-learning", "provenance", "research-methodology"],
    suggestedActionKinds: ["inspect-uncertainty", "review-model-evidence", "trace-provenance", "validate-representative-year"],
  },
] as const satisfies readonly MissionSpecialistDefinition[];

const WORKSPACE_SPECIALIST: Readonly<Record<WorkspaceId, SpecialistId>> = {
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

const OBJECT_SPECIALIST: Readonly<Partial<Record<MissionObjectKind, SpecialistId>>> = {
  cloud: "meteorologist",
  "weather-field": "meteorologist",
  sun: "solar-physicist",
  irradiance: "solar-physicist",
  "solar-array": "pv-systems-engineer",
  "solar-panel": "pv-systems-engineer",
  inverter: "pv-systems-engineer",
  "forecast-model": "machine-learning-researcher",
  experiment: "machine-learning-researcher",
  uncertainty: "validation-engineer",
  "validation-metric": "validation-engineer",
  battery: "battery-systems-engineer",
  "battery-cycle": "battery-systems-engineer",
  grid: "grid-engineer",
  "financial-metric": "financial-analyst",
  "climate-series": "climate-scientist",
  region: "climate-scientist",
  dataset: "data-provenance-auditor",
  "provenance-node": "data-provenance-auditor",
  scenario: "research-methodology-specialist",
  visualisation: "scientific-visualisation-specialist",
  "publication-artifact": "publication-assistant",
};

const SPECIALIST_BY_ID = new Map<SpecialistId, MissionSpecialistDefinition>(
  MISSION_SPECIALISTS.map((specialist) => [specialist.id, specialist]),
);

export function specialistById(id: SpecialistId): MissionSpecialistDefinition {
  const specialist = SPECIALIST_BY_ID.get(id);
  if (!specialist) throw new Error(`Unknown Mission Intelligence specialist: ${id}.`);
  return specialist;
}

export function specialistForDomain(domain: EvidenceDomain): MissionSpecialistDefinition {
  const specialist = MISSION_SPECIALISTS.find((item) => item.domain === domain);
  if (!specialist) throw new Error(`No Mission Intelligence specialist owns domain: ${domain}.`);
  return specialist;
}

/** Object expertise always overrides the workspace default. */
export function routeSpecialist(
  workspaceId: WorkspaceId,
  selection: MissionContextV1["selection"] = null,
): MissionSpecialistDefinition {
  const specialistId = selection ? OBJECT_SPECIALIST[selection.kind] : undefined;
  return specialistById(specialistId ?? WORKSPACE_SPECIALIST[workspaceId]);
}

export function collaboratingSpecialists(
  context: MissionContextV1,
  active: MissionSpecialistDefinition = routeSpecialist(context.workspaceId, context.selection),
  evidence: readonly EvidenceDatumV1[] = context.evidence.evidence,
): MissionSpecialistDefinition[] {
  const domains = new Set<EvidenceDomain>(context.objective.preferredDomains);
  for (const datum of evidence) {
    if (datum.availability === "available") domains.add(datum.ref.domain);
  }
  return MISSION_SPECIALISTS.filter(
    (specialist) => specialist.id !== active.id && domains.has(specialist.domain),
  );
}
