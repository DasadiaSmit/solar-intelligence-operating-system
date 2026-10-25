import type {
  EvidenceDatumV1,
  EvidenceDomain,
  EvidenceRefV1,
  MissionArtifactV1,
  MissionCapability,
  MissionContextV1,
  MissionDependencyFingerprintV1,
  MissionEvidenceBundleV1,
  MissionModelContextV1,
  MissionObjectiveIntent,
  MissionObjectiveV1,
  MissionSelectionV1,
  ScientificDataClass,
  ScientificLifecycle,
  WorkspaceId,
} from "@/lib/mission-intelligence/contracts";
import type {
  HourDatum,
  Lifecycle,
  NormalizedSnapshot,
  ScenarioConfig,
  ScenarioResult,
} from "@/components/solar-os/model";
import { numberOf, recordOf, stringOf } from "@/components/solar-os/model";
import type { AnnualResearchStudy } from "@/lib/research";

export interface MissionContextAdapterInput {
  workspaceId: WorkspaceId;
  selection: MissionSelectionV1 | null;
  objective: MissionObjectiveV1;
  base: NormalizedSnapshot;
  result: ScenarioResult;
  scenario: ScenarioConfig;
  selectedIndex: number;
  artifacts?: readonly MissionArtifactV1[];
  activeStudy?: AnnualResearchStudy | null;
}

interface FactInput {
  key: string;
  label: string;
  value: number | string | boolean;
  unit: string | null;
  domain: EvidenceDomain;
  lifecycle?: ScientificLifecycle;
  dataClass?: ScientificDataClass;
  locator: string;
  timestampUtc?: string | null;
  quality?: number | null;
  sourceType?: EvidenceRefV1["sourceType"];
  model?: EvidenceRefV1["model"];
}

const WORKSPACE_OBJECTIVES: Record<WorkspaceId, {
  intent: MissionObjectiveIntent;
  label: string;
  requiredFactKeys: readonly string[];
  preferredDomains: readonly EvidenceDomain[];
}> = {
  DT: { intent: "understand-current-state", label: "Explain the linked digital-twin state", requiredFactKeys: ["hour.ac", "hour.poa"], preferredDomains: ["solar-physics", "pv-system"] },
  AF: { intent: "explain-annual-yield", label: "Explain the representative annual estimate", requiredFactKeys: ["annual.generation", "annual.p50"], preferredDomains: ["forecasting", "research-methodology"] },
  WA: { intent: "explain-linked-interval", label: "Explain the linked atmospheric interval", requiredFactKeys: ["hour.cloud", "hour.ghi"], preferredDomains: ["meteorology", "solar-physics"] },
  ML: { intent: "validate-result", label: "Assess the active forecast-model evidence", requiredFactKeys: ["model.0.name"], preferredDomains: ["machine-learning", "validation"] },
  RV: { intent: "validate-result", label: "Validate the linked forecast replay evidence", requiredFactKeys: ["hour.p10", "hour.p90"], preferredDomains: ["validation", "forecasting"] },
  AE: { intent: "optimise-system", label: "Assess the active array configuration", requiredFactKeys: ["scenario.tilt", "scenario.azimuth"], preferredDomains: ["pv-system", "solar-physics"] },
  SR: { intent: "compare-scenarios", label: "Assess scenario resilience and evidence boundaries", requiredFactKeys: ["annual.generation"], preferredDomains: ["research-methodology", "grid"] },
  BE: { intent: "understand-current-state", label: "Explain linked storage dispatch", requiredFactKeys: ["hour.battery-soc", "scenario.battery-capacity"], preferredDomains: ["battery", "grid"] },
  RM: { intent: "understand-current-state", label: "Assess available regional solar evidence", requiredFactKeys: [], preferredDomains: ["climate", "meteorology"] },
  CL: { intent: "compare-historical-years", label: "Compare the four-year climate evidence", requiredFactKeys: ["representative.method"], preferredDomains: ["climate", "research-methodology"] },
  FI: { intent: "assess-financial-impact", label: "Assess tariff-screened energy value", requiredFactKeys: ["annual.energy-value"], preferredDomains: ["finance", "forecasting"] },
  PA: { intent: "trace-provenance", label: "Audit the active result lineage", requiredFactKeys: ["provenance.provider"], preferredDomains: ["provenance"] },
  RP: { intent: "prepare-publication-evidence", label: "Prepare claim-safe publication evidence", requiredFactKeys: ["annual.generation", "provenance.provider"], preferredDomains: ["publication", "visualisation", "research-methodology"] },
  MC: { intent: "understand-current-state", label: "Synthesize the current operating mission", requiredFactKeys: ["annual.generation", "annual.quality"], preferredDomains: ["research-methodology", "validation"] },
};

export function objectiveForWorkspace(workspaceId: WorkspaceId): MissionObjectiveV1 {
  const definition = WORKSPACE_OBJECTIVES[workspaceId];
  return {
    id: `objective:${workspaceId}:${definition.intent}`,
    ...definition,
  };
}

export function hashMissionValue(value: unknown): string {
  const encoded = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < encoded.length; index += 1) {
    hash ^= encoded.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function scenarioHash(scenario: ScenarioConfig): string {
  return `scenario_${hashMissionValue([
    scenario.capacityKw,
    scenario.tiltDeg,
    scenario.azimuthDeg,
    scenario.systemLossPct,
    scenario.batteryKwh,
    scenario.importPrice,
    scenario.exportPrice,
    scenario.carbonKgPerKwh,
    scenario.currency,
  ])}`;
}

export function arrayConfigurationHash(scenario: Pick<ScenarioConfig, "capacityKw" | "tiltDeg" | "azimuthDeg" | "systemLossPct">): string {
  return `array_${hashMissionValue([
    scenario.capacityKw,
    scenario.tiltDeg,
    scenario.azimuthDeg,
    scenario.systemLossPct,
  ])}`;
}

export function energyConfigurationHash(scenario: Pick<ScenarioConfig, "batteryKwh" | "importPrice" | "exportPrice" | "carbonKgPerKwh" | "currency">): string {
  return `energy_${hashMissionValue([
    scenario.batteryKwh,
    scenario.importPrice,
    scenario.exportPrice,
    scenario.carbonKgPerKwh,
    scenario.currency,
  ])}`;
}

function lifecycle(value: Lifecycle | undefined): ScientificLifecycle {
  return (value?.toLowerCase() as ScientificLifecycle | undefined) ?? "experimental";
}

function inferDataClass(base: NormalizedSnapshot): ScientificDataClass {
  const descriptor = `${base.mode} ${base.provider}`.toLowerCase();
  if (/reanalysis|era5/.test(descriptor)) return "reanalysis";
  if (/forecast/.test(descriptor) && !/sample|simulat/.test(descriptor)) return "issued-forecast";
  return /sample|simulat|deterministic/.test(descriptor) ? "simulation" : "unknown";
}

function declaredDataClass(value: string): ScientificDataClass {
  const normalized = value.toLowerCase().replaceAll("_", "-");
  if (normalized.includes("reanalysis")) return "reanalysis";
  if (normalized.includes("observation")) return "observation";
  if (normalized.includes("forecast")) return "issued-forecast";
  if (normalized.includes("climate")) return "climate-scenario";
  if (normalized.includes("simulat") || normalized.includes("sample")) return "simulation";
  return "unknown";
}

function refFor(base: NormalizedSnapshot, fact: FactInput): EvidenceDatumV1 {
  const id = `evidence:${base.resultId}:${fact.key}`;
  return {
    ref: {
      id,
      resultId: base.resultId,
      sourceType: fact.sourceType ?? "operating-snapshot",
      sourceId: base.resultId,
      factKey: fact.key,
      locator: fact.locator,
      label: fact.label,
      domain: fact.domain,
      lifecycle: fact.lifecycle ?? "experimental",
      dataClass: fact.dataClass ?? inferDataClass(base),
      provider: {
        id: base.datasetVersion,
        name: base.provider,
        product: base.datasetVersion,
        version: base.datasetVersion,
      },
      model: fact.model ?? {
        id: base.modelName,
        name: base.modelName,
        version: base.calculationVersion,
      },
      issueTimeUtc: Number.isNaN(Date.parse(base.issueTime)) ? null : base.issueTime,
      validRangeUtc: base.hours.length
        ? [base.hours[0].timestamp, base.hours[base.hours.length - 1].timestamp]
        : null,
      timestampUtc: fact.timestampUtc ?? null,
      resolution: base.resolution,
      unit: fact.unit,
      quality: {
        score: fact.quality ?? base.summary.qualityScore / 100,
        completeness: base.hours.length === 8760 ? 1 : Math.min(1, base.hours.length / 8760),
        flags: inferDataClass(base) === "simulation" ? ["SIMULATED_SAMPLE"] : [],
      },
      provenance: {
        verified: base.provenance.length > 0,
        snapshotIds: [base.datasetVersion],
        datasetVersion: base.datasetVersion,
        calculationVersion: base.calculationVersion,
        contentHash: base.resultId,
      },
    },
    value: fact.value,
    availability: "available",
  };
}

function hourFacts(base: NormalizedSnapshot, hour: HourDatum | undefined): FactInput[] {
  if (!hour) return [];
  const prefix = `hourly/${hour.timestamp}`;
  const quality = hour.quality;
  return [
    { key: "hour.timestamp", label: "Linked interval", value: hour.timestamp, unit: null, domain: "research-methodology", locator: `${prefix}/timestamp`, timestampUtc: hour.timestamp, quality },
    { key: "hour.cloud", label: "Cloud cover", value: hour.cloud * 100, unit: "%", domain: "meteorology", locator: `${prefix}/cloud`, timestampUtc: hour.timestamp, quality },
    { key: "hour.ghi", label: "Global horizontal irradiance", value: hour.ghi, unit: "W/m²", domain: "meteorology", locator: `${prefix}/ghi`, timestampUtc: hour.timestamp, quality },
    { key: "hour.temperature", label: "Ambient temperature", value: hour.tempC, unit: "°C", domain: "meteorology", locator: `${prefix}/temperature`, timestampUtc: hour.timestamp, quality },
    { key: "hour.poa", label: "Effective plane-of-array irradiance", value: hour.poa, unit: "W/m²", domain: "solar-physics", locator: `${prefix}/poa`, timestampUtc: hour.timestamp, quality },
    { key: "hour.sun-elevation", label: "Solar elevation", value: hour.sunElevationDeg, unit: "deg", domain: "solar-physics", locator: `${prefix}/sun-elevation`, timestampUtc: hour.timestamp, quality },
    { key: "hour.sun-azimuth", label: "Solar azimuth", value: hour.sunAzimuthDeg, unit: "deg", domain: "solar-physics", locator: `${prefix}/sun-azimuth`, timestampUtc: hour.timestamp, quality },
    { key: "hour.ac", label: "Modelled AC generation", value: hour.acKw, unit: "kWh/1h", domain: "pv-system", locator: `${prefix}/ac`, timestampUtc: hour.timestamp, quality, lifecycle: "simulated", sourceType: "simulation" },
    { key: "hour.p10", label: "Model interval lower bound", value: hour.p10Kw, unit: "kWh/1h", domain: "forecasting", locator: `${prefix}/p10`, timestampUtc: hour.timestamp, quality },
    { key: "hour.p90", label: "Model interval upper bound", value: hour.p90Kw, unit: "kWh/1h", domain: "forecasting", locator: `${prefix}/p90`, timestampUtc: hour.timestamp, quality },
    { key: "hour.battery-soc", label: "Simulated battery state of charge", value: hour.socKwh, unit: "kWh", domain: "battery", locator: `${prefix}/battery-soc`, timestampUtc: hour.timestamp, quality, lifecycle: "simulated", sourceType: "simulation" },
    { key: "hour.grid-import", label: "Simulated grid import", value: hour.gridImportKw, unit: "kWh/1h", domain: "grid", locator: `${prefix}/grid-import`, timestampUtc: hour.timestamp, quality, lifecycle: "simulated", sourceType: "simulation" },
    { key: "hour.grid-export", label: "Simulated grid export", value: hour.gridExportKw, unit: "kWh/1h", domain: "grid", locator: `${prefix}/grid-export`, timestampUtc: hour.timestamp, quality, lifecycle: "simulated", sourceType: "simulation" },
    { key: "hour.quality", label: "Linked interval data quality", value: quality * 100, unit: "%", domain: "provenance", locator: `${prefix}/quality`, timestampUtc: hour.timestamp, quality },
  ];
}

function annualFacts(base: NormalizedSnapshot, result: ScenarioResult, scenario: ScenarioConfig): FactInput[] {
  const simulatedLifecycle: ScientificLifecycle = result.changed ? "simulated" : "experimental";
  return [
    { key: "annual.generation", label: "Annual modelled generation", value: result.summary.annualKwh, unit: "kWh/year", domain: "pv-system", locator: "summary/annual-generation", lifecycle: simulatedLifecycle, sourceType: "simulation" },
    { key: "annual.specific-yield", label: "Specific yield", value: result.summary.specificYield, unit: "kWh/kWp/year", domain: "pv-system", locator: "summary/specific-yield", lifecycle: simulatedLifecycle, sourceType: "simulation" },
    { key: "annual.p10", label: "Four-source-year lower non-exceedance quantile", value: result.summary.p10Kwh, unit: "kWh/year", domain: "forecasting", locator: "summary/p10", lifecycle: "experimental" },
    { key: "annual.p50", label: "Representative annual central estimate", value: result.summary.p50Kwh, unit: "kWh/year", domain: "forecasting", locator: "summary/p50", lifecycle: "experimental" },
    { key: "annual.p90", label: "Four-source-year upper non-exceedance quantile", value: result.summary.p90Kwh, unit: "kWh/year", domain: "forecasting", locator: "summary/p90", lifecycle: "experimental" },
    { key: "annual.quality", label: "Annual evidence data quality", value: result.summary.qualityScore, unit: "%", domain: "provenance", locator: "summary/quality" },
    { key: "annual.interval-coverage", label: "Model interval coverage", value: result.summary.coverage, unit: "%", domain: "validation", locator: "summary/coverage" },
    { key: "annual.self-consumption", label: "Self-consumption", value: result.summary.selfConsumptionPct, unit: "%", domain: "battery", locator: "summary/self-consumption", lifecycle: "simulated" },
    { key: "annual.grid-import", label: "Annual simulated grid import", value: result.summary.gridImportKwh, unit: "kWh/year", domain: "grid", locator: "summary/grid-import", lifecycle: "simulated" },
    { key: "annual.grid-export", label: "Annual simulated grid export", value: result.summary.gridExportKwh, unit: "kWh/year", domain: "grid", locator: "summary/grid-export", lifecycle: "simulated" },
    { key: "annual.energy-value", label: "Tariff-screened annual energy value", value: result.summary.revenue, unit: `${scenario.currency}/year`, domain: "finance", locator: "summary/energy-value", lifecycle: "simulated", sourceType: "financial-run" },
    { key: "annual.carbon", label: "Modelled carbon avoided", value: result.summary.carbonKg, unit: "kgCO₂e/year", domain: "climate", locator: "summary/carbon", lifecycle: "simulated" },
    { key: "scenario.capacity", label: "DC array capacity", value: scenario.capacityKw, unit: "kWp", domain: "pv-system", locator: "scenario/capacity", lifecycle: "simulated", sourceType: "simulation" },
    { key: "scenario.tilt", label: "Panel tilt", value: scenario.tiltDeg, unit: "deg", domain: "pv-system", locator: "scenario/tilt", lifecycle: "simulated", sourceType: "simulation" },
    { key: "scenario.azimuth", label: "Panel azimuth", value: scenario.azimuthDeg, unit: "deg", domain: "pv-system", locator: "scenario/azimuth", lifecycle: "simulated", sourceType: "simulation" },
    { key: "scenario.system-loss", label: "Aggregate system-loss screen", value: scenario.systemLossPct, unit: "%", domain: "pv-system", locator: "scenario/system-loss", lifecycle: "simulated", sourceType: "simulation" },
    { key: "scenario.battery-capacity", label: "Battery capacity", value: scenario.batteryKwh, unit: "kWh", domain: "battery", locator: "scenario/battery-capacity", lifecycle: "simulated", sourceType: "simulation" },
    { key: "scenario.import-price", label: "Import tariff", value: scenario.importPrice, unit: `${scenario.currency}/kWh`, domain: "finance", locator: "scenario/import-price", lifecycle: "simulated", sourceType: "financial-run" },
    { key: "scenario.export-price", label: "Export tariff", value: scenario.exportPrice, unit: `${scenario.currency}/kWh`, domain: "finance", locator: "scenario/export-price", lifecycle: "simulated", sourceType: "financial-run" },
  ];
}

function modelFacts(base: NormalizedSnapshot): FactInput[] {
  return base.models.flatMap((model, index) => {
    const slug = `model.${index}`;
    const modelIdentity = { id: slug, name: model.name, version: base.calculationVersion };
    const facts: FactInput[] = [
      { key: `${slug}.name`, label: `Registered model ${index + 1}`, value: model.name, unit: null, domain: "machine-learning", locator: `models/${index}/name`, lifecycle: lifecycle(model.status), sourceType: "forecast-run", model: modelIdentity },
    ];
    if (Number.isFinite(model.mae)) facts.push({ key: `${slug}.mae`, label: `${model.name} MAE`, value: model.mae as number, unit: "kWh/1h", domain: "validation", locator: `models/${index}/metrics/mae`, lifecycle: lifecycle(model.status), sourceType: "forecast-run", model: modelIdentity });
    if (Number.isFinite(model.rmse)) facts.push({ key: `${slug}.rmse`, label: `${model.name} RMSE`, value: model.rmse as number, unit: "kWh/1h", domain: "validation", locator: `models/${index}/metrics/rmse`, lifecycle: lifecycle(model.status), sourceType: "forecast-run", model: modelIdentity });
    if (Number.isFinite(model.coverage)) facts.push({ key: `${slug}.coverage`, label: `${model.name} interval coverage`, value: model.coverage as number, unit: "%", domain: "validation", locator: `models/${index}/metrics/coverage`, lifecycle: lifecycle(model.status), sourceType: "forecast-run", model: modelIdentity });
    return facts;
  });
}

function representativeFacts(base: NormalizedSnapshot): FactInput[] {
  const representative = recordOf(base.representativeYear);
  const facts: FactInput[] = [{
    key: "representative.method",
    label: "Representative-year construction method",
    value: stringOf(representative, ["method"], "Undeclared method"),
    unit: null,
    domain: "research-methodology",
    locator: "representative-year/method",
    lifecycle: "experimental",
  }];
  const comparisons = Array.isArray(representative.comparisons) ? representative.comparisons.map(recordOf) : [];
  for (const comparison of comparisons) {
    const year = stringOf(comparison, ["year"], "unknown");
    facts.push({
      key: `historical.${year}.generation`,
      label: `${year} historical modelled generation`,
      value: numberOf(comparison, ["generationKWh"], 0),
      unit: "kWh/year",
      domain: "climate",
      locator: `representative-year/comparisons/${year}/generation`,
      lifecycle: "simulated",
      sourceType: "simulation",
    });
    facts.push({
      key: `historical.${year}.delta`,
      label: `${year} difference from representative year`,
      value: numberOf(comparison, ["deltaFromRepresentativePct"], 0),
      unit: "%",
      domain: "climate",
      locator: `representative-year/comparisons/${year}/delta`,
      lifecycle: "experimental",
    });
  }
  return facts;
}

function provenanceFacts(base: NormalizedSnapshot): FactInput[] {
  const facts: FactInput[] = [{ key: "provenance.provider", label: "Active data provider", value: base.provider, unit: null, domain: "provenance", locator: "provenance/provider", lifecycle: "implemented" }];
  base.provenance.forEach((row, index) => facts.push({
    key: `provenance.${index}`,
    label: row.key,
    value: row.value,
    unit: null,
    domain: "provenance",
    locator: `provenance/${index}`,
    lifecycle: "implemented",
  }));
  return facts;
}

function lossFacts(base: NormalizedSnapshot): FactInput[] {
  return base.losses.map((loss, index) => ({
    key: `loss.${index}`,
    label: loss.label,
    value: loss.pct,
    unit: "%",
    domain: "solar-physics" as const,
    locator: `loss-chain/${index}`,
    lifecycle: "implemented" as const,
  }));
}

function annualStudyEvidence(study: AnnualResearchStudy): EvidenceDatumV1[] {
  const firstDataset = study.datasets[0];
  const lifecycle: ScientificLifecycle = study.sourceMode === "reanalysis" ? "experimental" : "simulated";
  const studyQuality = study.datasets.length
    ? study.datasets.reduce((total, dataset) => total + dataset.scienceQualityScore, 0) / study.datasets.length
    : null;
  const studyCompleteness = study.datasets.length
    ? study.datasets.reduce((total, dataset) => total + dataset.scienceCompleteness, 0) / study.datasets.length
    : null;
  const studyRange = study.datasets.length
    ? [study.datasets[0].validRangeUtc[0], study.datasets[study.datasets.length - 1].validRangeUtc[1]] as const
    : null;
  const factInputs: Array<{ key: string; label: string; value: number | string; unit: string | null; locator: string; domain: EvidenceDomain }> = [
    { key: "study.id", label: "Active annual research study", value: study.studyId, unit: null, locator: "annual-study/study-id", domain: "research-methodology" },
    { key: "study.annual.central", label: "Annual-study central estimate", value: study.annualEstimate.centralEstimateKWh, unit: "kWh/year", locator: "annual-study/annual-estimate/central", domain: "forecasting" },
    { key: "study.annual.q10", label: "Annual-study four-year Q10", value: study.annualEstimate.uncertainty.lowerKWh, unit: "kWh/year", locator: "annual-study/annual-estimate/q10", domain: "forecasting" },
    { key: "study.annual.q50", label: "Annual-study four-year Q50", value: study.annualEstimate.uncertainty.medianKWh, unit: "kWh/year", locator: "annual-study/annual-estimate/q50", domain: "forecasting" },
    { key: "study.annual.q90", label: "Annual-study four-year Q90", value: study.annualEstimate.uncertainty.upperKWh, unit: "kWh/year", locator: "annual-study/annual-estimate/q90", domain: "forecasting" },
    { key: "study.validation.protocol", label: "Chronological validation protocol", value: study.validation.protocol, unit: null, locator: "annual-study/validation/protocol", domain: "validation" },
  ];
  const createDatum = (
    item: (typeof factInputs)[number],
    provider = {
      id: firstDataset?.providerId ?? "annual-study",
      name: firstDataset?.providerName ?? "Annual research study",
      product: firstDataset?.product ?? study.sourceMode,
      version: firstDataset?.schemaVersion ?? study.version,
    },
    dataClass: ScientificDataClass = firstDataset ? declaredDataClass(firstDataset.actualDataClass) : study.sourceMode === "simulation" ? "simulation" : "reanalysis",
    quality = studyQuality,
    completeness = studyCompleteness,
    snapshotIds: readonly string[] = study.provenance.orderedDatasetSnapshotIds,
  ): EvidenceDatumV1 => ({
    ref: {
      id: `evidence:${study.studyId}:${item.key}`,
      resultId: study.studyId,
      sourceType: "annual-study",
      sourceId: study.studyId,
      factKey: item.key,
      locator: item.locator,
      label: item.label,
      domain: item.domain,
      lifecycle,
      dataClass,
      provider,
      model: { id: study.configuration.modelVersion, name: "Annual research model protocol", version: study.configuration.modelVersion },
      issueTimeUtc: null,
      validRangeUtc: studyRange,
      timestampUtc: null,
      resolution: "hourly source / annual aggregation",
      unit: item.unit,
      quality: { score: quality, completeness, flags: study.sourceMode === "simulation" ? ["SIMULATED_SAMPLE"] : [] },
      provenance: {
        verified: snapshotIds.length > 0,
        snapshotIds,
        datasetVersion: study.provenance.representativeYearId,
        calculationVersion: study.provenance.calculationVersion,
        contentHash: study.studyId,
      },
    },
    value: item.value,
    availability: "available",
  });
  const evidence = factInputs.map((item) => createDatum(item));
  study.datasets.forEach((dataset) => {
    const provider = { id: dataset.providerId, name: dataset.providerName, product: dataset.product, version: dataset.schemaVersion };
    evidence.push(createDatum({
      key: `study.dataset.${dataset.year}.quality`,
      label: `${dataset.year} science data quality`,
      value: dataset.scienceQualityScore * 100,
      unit: "%",
      locator: `annual-study/datasets/${dataset.year}/science-quality`,
      domain: "provenance",
    }, provider, declaredDataClass(dataset.actualDataClass), dataset.scienceQualityScore, dataset.scienceCompleteness, [dataset.snapshotId]));
    evidence.push(createDatum({
      key: `study.dataset.${dataset.year}.provider`,
      label: `${dataset.year} source product`,
      value: `${dataset.providerName} / ${dataset.product}`,
      unit: null,
      locator: `annual-study/datasets/${dataset.year}/provider`,
      domain: "provenance",
    }, provider, declaredDataClass(dataset.actualDataClass), dataset.scienceQualityScore, dataset.scienceCompleteness, [dataset.snapshotId]));
  });
  return evidence;
}

function capabilitiesFor(base: NormalizedSnapshot, activeStudy: AnnualResearchStudy | null): MissionCapability[] {
  const capabilities: MissionCapability[] = ["hourly-weather", "hourly-solar"];
  if (base.models.length) capabilities.push("forecast-validation", "model-evidence");
  if (base.provenance.length) capabilities.push("provenance-lineage");
  if (recordOf(base.representativeYear).comparisons) capabilities.push("historical-years", "annual-uncertainty");
  if (base.config.batteryKwh > 0) capabilities.push("battery-dispatch");
  capabilities.push("grid-flow", "financial-screening", "climate-evidence", "optimisation-evidence", "publication-export");
  if (activeStudy) capabilities.push("authoritative-recalculation");
  return capabilities;
}

function dependencies(base: NormalizedSnapshot, scenario: ScenarioConfig): MissionDependencyFingerprintV1[] {
  return [
    { key: "operating-result", label: "Operating result", valueHash: base.resultId },
    { key: "scenario", label: "Active scenario", valueHash: scenarioHash(scenario) },
    { key: "array-configuration", label: "Array configuration", valueHash: arrayConfigurationHash(scenario) },
    { key: "energy-configuration", label: "Battery, tariff and carbon configuration", valueHash: energyConfigurationHash(scenario) },
    { key: "dataset", label: "Dataset version", valueHash: hashMissionValue(base.datasetVersion) },
    { key: "calculation", label: "Calculation version", valueHash: hashMissionValue(base.calculationVersion) },
  ];
}

export function operatingSnapshotArtifact(base: NormalizedSnapshot): MissionArtifactV1 {
  return {
    id: `artifact:${base.resultId}`,
    kind: "simulation",
    label: "Base annual operating simulation",
    lifecycle: "simulated",
    resultId: base.resultId,
    evidenceRefIds: [
      `evidence:${base.resultId}:annual.generation`,
      `evidence:${base.resultId}:annual.quality`,
      `evidence:${base.resultId}:provenance.provider`,
    ],
    dependencies: dependencies(base, base.config),
    registeredAtUtc: Number.isFinite(Date.parse(base.issueTime))
      ? base.issueTime
      : "1970-01-01T00:00:00.000Z",
  };
}

export function buildMissionContext(input: MissionContextAdapterInput): MissionContextV1 {
  const { base, result, scenario, workspaceId, selection, objective } = input;
  const selectedIndex = Math.min(Math.max(0, input.selectedIndex), Math.max(0, result.hours.length - 1));
  const current = result.hours[selectedIndex];
  const facts = [
    ...hourFacts(base, current),
    ...annualFacts(base, result, scenario),
    ...modelFacts(base),
    ...representativeFacts(base),
    ...provenanceFacts(base),
    ...lossFacts(base),
  ];
  const evidence = facts.map((fact) => refFor(base, fact));
  if (input.activeStudy) evidence.push(...annualStudyEvidence(input.activeStudy));
  const bundle: MissionEvidenceBundleV1 = {
    bundleId: `bundle:${base.resultId}:${selectedIndex}:${scenarioHash(scenario)}`,
    resultIds: [base.resultId, ...(input.activeStudy ? [input.activeStudy.studyId] : [])],
    evidence,
    assumptions: [
      ...base.assumptions,
      ...(input.activeStudy?.representativeYear.assumptions ?? []),
      ...(result.changed ? result.notes : []),
    ],
    uncertainty: [
      stringOf(recordOf(base.representativeYear), ["uncertaintyMethod"], "Uncertainty method was not declared in the active snapshot."),
      ...(input.activeStudy ? [input.activeStudy.annualEstimate.uncertainty.method, ...input.activeStudy.annualEstimate.uncertainty.limitations] : []),
      "The four-source-year annual quantiles are empirical non-exceedance values, not a calibrated 80% forecast interval.",
    ],
    limitations: [
      inferDataClass(base) === "simulation"
        ? "The active operating snapshot is deterministic sample/simulation evidence, not measured plant production."
        : "The active data class does not by itself establish measured plant performance.",
      "Client-side scenario changes are screening calculations and require authoritative recalculation before engineering, financial, or bankability use.",
      "A four-year record does not establish long-term climate trend or future climate risk.",
      ...(input.activeStudy?.limitations ?? []),
    ],
    warnings: result.changed ? ["The active scenario differs from the reproducible base result and is classified SIMULATED."] : [],
  };
  const activeModelDatum = base.models.find((model) => model.status === "IMPLEMENTED" && Number.isFinite(model.mae))
    ?? base.models.find((model) => Number.isFinite(model.mae))
    ?? base.models[0];
  const activeModel: MissionModelContextV1 | null = activeModelDatum ? {
    id: `model:${hashMissionValue(activeModelDatum.name)}`,
    name: activeModelDatum.name,
    version: base.calculationVersion,
    lifecycle: lifecycle(activeModelDatum.status),
    evidenceRefIds: evidence.filter((datum) => datum.ref.model.name === activeModelDatum.name).map((datum) => datum.ref.id),
  } : null;
  const currentDependencies = dependencies(base, scenario);
  return {
    contextId: `context:${hashMissionValue([workspaceId, selection?.objectId, current?.timestamp, scenarioHash(scenario), objective.id, base.resultId])}`,
    projectId: "solar-intelligence-operating-system",
    workspaceId,
    selection,
    objective,
    linkedTimestampUtc: current?.timestamp ?? null,
    baseScenarioHash: scenarioHash(base.config),
    activeScenarioHash: scenarioHash(scenario),
    activeResultId: base.resultId,
    activeStudyId: input.activeStudy?.studyId ?? null,
    activeModel,
    activeExperiment: null,
    currentDependencies,
    artifacts: input.artifacts ?? [],
    capabilities: capabilitiesFor(base, input.activeStudy ?? null),
    evidence: bundle,
  };
}

export function defaultSelectionForWorkspace(workspaceId: WorkspaceId): MissionSelectionV1 {
  return {
    kind: "workspace",
    objectId: `workspace:${workspaceId}`,
    label: WORKSPACE_OBJECTIVES[workspaceId].label,
    workspaceId,
    evidenceRefIds: [],
    metadata: { source: "workspace-default" },
  };
}
