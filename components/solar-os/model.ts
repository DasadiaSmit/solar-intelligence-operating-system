import type { OperatingSnapshot } from "@/lib/operating-snapshot";
import type { ClientHourTuple, ClientOperatingSnapshot } from "@/lib/client-snapshot";

export type OperatingSnapshotInput = OperatingSnapshot | ClientOperatingSnapshot;

export type Lifecycle = "IMPLEMENTED" | "EXPERIMENTAL" | "SIMULATED" | "PLANNED";

export interface HourDatum {
  index: number;
  timestamp: string;
  day: number;
  hour: number;
  ghi: number;
  poa: number;
  tempC: number;
  cloud: number;
  acKw: number;
  p10Kw: number;
  p90Kw: number;
  loadKw: number;
  socKwh: number;
  gridImportKw: number;
  gridExportKw: number;
  quality: number;
  sunElevationDeg: number;
  sunAzimuthDeg: number;
}

export interface MonthDatum {
  month: string;
  energyKwh: number;
  p10Kwh: number;
  p90Kwh: number;
  peakKw: number;
  cloudPct: number;
}

export interface UiSummary {
  annualKwh: number;
  specificYield: number;
  p10Kwh: number;
  p50Kwh: number;
  p90Kwh: number;
  selfConsumptionPct: number;
  gridImportKwh: number;
  gridExportKwh: number;
  revenue: number;
  carbonKg: number;
  performanceRatio: number;
  coverage: number;
  qualityScore: number;
}

export interface ScenarioConfig {
  capacityKw: number;
  tiltDeg: number;
  azimuthDeg: number;
  systemLossPct: number;
  batteryKwh: number;
  importPrice: number;
  exportPrice: number;
  carbonKgPerKwh: number;
  currency: string;
}

export interface LossDatum {
  label: string;
  pct: number;
  stage?: string;
}

export interface ModelDatum {
  name: string;
  status: Lifecycle;
  mae?: number;
  rmse?: number;
  coverage?: number;
  note?: string;
}

export interface ProvenanceDatum {
  key: string;
  value: string;
  status?: string;
}

export interface NormalizedSnapshot {
  raw: OperatingSnapshotInput;
  mode: string;
  hours: HourDatum[];
  months: MonthDatum[];
  summary: UiSummary;
  config: ScenarioConfig;
  losses: LossDatum[];
  models: ModelDatum[];
  provenance: ProvenanceDatum[];
  provider: string;
  modelName: string;
  issueTime: string;
  resolution: string;
  units: string;
  calculationVersion: string;
  datasetVersion: string;
  assumptions: string[];
  representativeYear: Record<string, unknown>;
  optimization: Record<string, unknown>;
}

export interface ScenarioResult {
  hours: HourDatum[];
  months: MonthDatum[];
  summary: UiSummary;
  productionFactor: number;
  changed: boolean;
  notes: string[];
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function recordOf(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function numberOf(record: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = record[key];
    const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    if (Number.isFinite(number)) return number;
  }
  return fallback;
}

export function stringOf(record: Record<string, unknown>, keys: string[], fallback = "—"): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lifecycle(value: unknown, fallback: Lifecycle = "IMPLEMENTED"): Lifecycle {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized.includes("EXPERIMENT")) return "EXPERIMENTAL";
  if (normalized.includes("SIMULAT")) return "SIMULATED";
  if (normalized.includes("PLAN")) return "PLANNED";
  return fallback;
}

function flattenProvenance(value: unknown): ProvenanceDatum[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => {
      const item = recordOf(entry);
      const quality = recordOf(item.quality);
      const name = stringOf(item, ["name", "provider", "id"], `LINEAGE ${index + 1}`);
      const version = stringOf(item, ["version", "calculationVersion"], "unversioned");
      const status = stringOf(item, ["status", "kind"], "recorded");
      return [
        { key: name.toUpperCase(), value: version, status },
        ...(item.reproducibilityKey ? [{ key: "REPRODUCIBILITY KEY", value: String(item.reproducibilityKey), status: "verified" }] : []),
        ...(quality.score !== undefined ? [{ key: `${name.toUpperCase()} QUALITY`, value: `${Math.round(numberOf(quality, ["score"], 0) * 100)}%`, status: stringOf(quality, ["level"], "scored") }] : []),
      ];
    }).slice(0, 18);
  }
  const record = recordOf(value);
  const preferred: Array<[string, string[]]> = [
    ["PROVIDER", ["provider", "dataProvider", "source"]],
    ["MODEL", ["model", "modelName", "forecastModel"]],
    ["ISSUE TIME", ["issueTime", "forecastIssueTime", "issuedAt"]],
    ["DATA TIME", ["dataTimestamp", "timestamp", "generatedAt"]],
    ["RESOLUTION", ["resolution", "temporalResolution"]],
    ["UNITS", ["units", "unit"]],
    ["DATASET", ["datasetVersion", "snapshotId", "version"]],
    ["CALCULATION", ["calculationVersion", "calcVersion"]],
    ["QUALITY", ["quality", "qualityScore"]],
  ];
  const rows: ProvenanceDatum[] = [];
  const claimed = new Set<string>();
  for (const [label, keys] of preferred) {
    for (const key of keys) {
      if (record[key] !== undefined && record[key] !== null) {
        const raw = record[key];
        rows.push({ key: label, value: typeof raw === "object" ? JSON.stringify(raw) : String(raw) });
        claimed.add(key);
        break;
      }
    }
  }
  for (const [key, raw] of Object.entries(record)) {
    if (claimed.has(key) || raw === undefined || raw === null || typeof raw === "object") continue;
    rows.push({ key: key.replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase(), value: String(raw) });
  }
  return rows.slice(0, 16);
}

function normalizeModels(value: unknown): ModelDatum[] {
  const raw = Array.isArray(value)
    ? value
    : Object.entries(recordOf(value)).map(([name, detail]) => ({ name, ...recordOf(detail) }));
  return raw.map((entry, index) => {
    const item = recordOf(entry);
    const metrics = recordOf(item.metrics);
    return {
      name: stringOf(item, ["name", "model", "id"], `MODEL ${index + 1}`),
      status: lifecycle(item.status ?? item.lifecycle, index < 5 ? "IMPLEMENTED" : "PLANNED"),
      mae: numberOf(metrics, ["mae"], numberOf(item, ["mae"], Number.NaN)),
      rmse: numberOf(metrics, ["rmse"], numberOf(item, ["rmse"], Number.NaN)),
      coverage: numberOf(metrics, ["coverage", "intervalCoverage"], numberOf(item, ["coverage"], Number.NaN)),
      note: stringOf(item, ["note", "description", "method"], ""),
    };
  });
}

function normalizeLosses(value: unknown): LossDatum[] {
  const raw = Array.isArray(value)
    ? value
    : Object.entries(recordOf(value)).map(([label, pct]) => ({ label, pct }));
  return raw
    .map((entry, index) => {
      const item = recordOf(entry);
      return {
        label: stringOf(item, ["label", "name", "cause", "stage"], `LOSS ${index + 1}`),
        pct: Math.abs(numberOf(item, ["pct", "percent", "lossPct", "value", "loss"], 0)),
        stage: stringOf(item, ["stage", "group"], ""),
      };
    })
    .filter((loss) => Number.isFinite(loss.pct) && loss.pct > 0);
}

function deriveMonths(hours: HourDatum[]): MonthDatum[] {
  const buckets = Array.from({ length: 12 }, (_, index) => ({
    month: MONTHS[index],
    energyKwh: 0,
    p10Kwh: 0,
    p90Kwh: 0,
    peakKw: 0,
    cloudTotal: 0,
    count: 0,
  }));
  hours.forEach((hour, index) => {
    const date = new Date(hour.timestamp);
    const monthIndex = Number.isNaN(date.getTime())
      ? Math.min(11, Math.floor(index / Math.max(1, hours.length / 12)))
      : date.getUTCMonth();
    const bucket = buckets[monthIndex];
    bucket.energyKwh += hour.acKw;
    bucket.p10Kwh += hour.p10Kw;
    bucket.p90Kwh += hour.p90Kw;
    bucket.peakKw = Math.max(bucket.peakKw, hour.acKw);
    bucket.cloudTotal += hour.cloud;
    bucket.count += 1;
  });
  return buckets.map(({ cloudTotal, count, ...month }) => ({
    ...month,
    cloudPct: count ? (cloudTotal / count) * (cloudTotal / count <= 1.01 ? 100 : 1) : 0,
  }));
}

export function normalizeSnapshot(snapshot: OperatingSnapshotInput): NormalizedSnapshot {
  const raw = snapshot as unknown as Record<string, unknown>;
  const summaryRaw = recordOf(raw.summary);
  const configRaw = recordOf(raw.config);
  const provenanceList = Array.isArray(raw.provenance) ? raw.provenance.map(recordOf) : [];
  const provenanceRaw = provenanceList[0] ?? recordOf(raw.provenance);
  const statusRaw = recordOf(raw.status);
  const hourlyRaw = Array.isArray(raw.hourly) ? raw.hourly : [];
  const transport = recordOf(raw.transport);
  const tupleTransport = transport.format === "sios-hour-tuple-v1";
  const intervalMs = Math.max(1, numberOf(transport, ["intervalSeconds"], 3600)) * 1000;
  const startMs = Date.parse(stringOf(transport, ["startTimestampUtc"], "2025-01-01T00:00:00.000Z"));

  const hours: HourDatum[] = hourlyRaw.map((entry, index) => {
    if (tupleTransport && Array.isArray(entry)) {
      const tuple = entry as ClientHourTuple;
      const timestamp = new Date(startMs + index * intervalMs).toISOString();
      const date = new Date(timestamp);
      return {
        index,
        timestamp,
        day: Math.floor(index / 24) + 1,
        hour: date.getUTCHours(),
        ghi: Math.max(0, tuple[0] ?? 0),
        poa: Math.max(0, tuple[1] ?? 0),
        tempC: tuple[2] ?? 0,
        cloud: clamp(tuple[3] ?? 0, 0, 1),
        acKw: Math.max(0, tuple[4] ?? 0),
        p10Kw: Math.max(0, tuple[5] ?? 0),
        p90Kw: Math.max(0, tuple[6] ?? 0),
        loadKw: Math.max(0, tuple[7] ?? 0),
        socKwh: Math.max(0, tuple[8] ?? 0),
        gridImportKw: Math.max(0, tuple[9] ?? 0),
        gridExportKw: Math.max(0, tuple[10] ?? 0),
        quality: clamp(tuple[11] ?? 0, 0, 1),
        sunElevationDeg: tuple[12] ?? (tuple[0] ? 35 : -10),
        sunAzimuthDeg: tuple[13] ?? 180,
      };
    }
    const item = recordOf(entry);
    const sun = recordOf(item.sun);
    const weather = recordOf(item.weather);
    const irradiance = recordOf(item.irradiance);
    const generation = recordOf(item.generation);
    const flow = recordOf(item.flow);
    const forecast = recordOf(item.forecast);
    const quality = recordOf(item.quality);
    const timestamp = stringOf(item, ["timestamp", "time", "dateTime"], new Date(Date.UTC(2024, 0, 1, index)).toISOString());
    const date = new Date(timestamp);
    const hour = numberOf(item, ["hour"], Number.isNaN(date.getTime()) ? index % 24 : date.getUTCHours());
    const day = numberOf(item, ["day", "dayOfYear"], Math.floor(index / 24) + 1);
    const cloudRaw = numberOf(item, ["cloud", "cloudCover", "cloudPct"], numberOf(weather, ["cloudCoverPct"], 0));
    const qualityRaw = numberOf(item, ["qualityScore"], numberOf(quality, ["score"], 1));
    return {
      index,
      timestamp,
      day,
      hour,
      ghi: Math.max(0, numberOf(item, ["ghi"], numberOf(weather, ["ghiWm2"], 0))),
      poa: Math.max(0, numberOf(item, ["poa", "poaIrradiance"], numberOf(irradiance, ["effectiveWm2", "globalWm2"], 0))),
      tempC: numberOf(item, ["tempC", "temperatureC", "temperature"], numberOf(weather, ["temperatureC"], 0)),
      cloud: clamp(cloudRaw > 1.01 ? cloudRaw / 100 : cloudRaw, 0, 1),
      acKw: Math.max(0, numberOf(item, ["acKw", "powerKw", "productionKw"], numberOf(generation, ["acKWh"], 0))),
      p10Kw: Math.max(0, numberOf(item, ["p10Kw", "lowerKw"], numberOf(forecast, ["p10KWh"], 0))),
      p90Kw: Math.max(0, numberOf(item, ["p90Kw", "upperKw"], numberOf(forecast, ["p90KWh"], 0))),
      loadKw: Math.max(0, numberOf(item, ["loadKw", "demandKw"], numberOf(flow, ["demandKWh"], 0))),
      socKwh: Math.max(0, numberOf(item, ["socKwh", "batterySocKwh"], numberOf(flow, ["batterySocKWh"], 0))),
      gridImportKw: Math.max(0, numberOf(item, ["gridImportKw", "importKw"], numberOf(flow, ["gridImportKWh"], 0))),
      gridExportKw: Math.max(0, numberOf(item, ["gridExportKw", "exportKw"], numberOf(flow, ["gridExportKWh"], 0))),
      quality: clamp(qualityRaw > 1.01 ? qualityRaw / 100 : qualityRaw, 0, 1),
      sunElevationDeg: numberOf(sun, ["apparentElevationDeg", "elevationDeg"], numberOf(weather, ["ghiWm2"], 0) ? 35 : -10),
      sunAzimuthDeg: numberOf(sun, ["azimuthDeg"], 180),
    };
  });

  const annualFromHours = hours.reduce((sum, item) => sum + item.acKw, 0);
  const p10FromHours = hours.reduce((sum, item) => sum + item.p10Kw, 0);
  const p90FromHours = hours.reduce((sum, item) => sum + item.p90Kw, 0);
  const arrayRaw = recordOf(configRaw.array);
  const batteryRaw = recordOf(configRaw.battery);
  const tariffRaw = recordOf(configRaw.tariff);
  const carbonRaw = recordOf(configRaw.carbon);
  const lossesRaw = recordOf(configRaw.losses);
  const capacityKw = Math.max(0.1, numberOf(configRaw, ["capacityKw", "dcCapacityKw", "systemCapacityKw", "capacity"], numberOf(arrayRaw, ["capacityKwDc"], 10)));
  const lossFactors = Object.values(lossesRaw).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const combinedLossPct = lossFactors.length ? (1 - lossFactors.reduce((retained, loss) => retained * (1 - clamp(loss, 0, 0.95)), 1)) * 100 : 14;
  const systemLossRaw = numberOf(configRaw, ["systemLossPct", "lossPct", "systemLoss"], combinedLossPct);
  const qualityRaw = numberOf(summaryRaw, ["qualityScore"], 0);
  const coverageRaw = numberOf(summaryRaw, ["coverage"], hours.length ? Math.min(1, hours.length / 8760) : 0);
  const annualKwh = numberOf(summaryRaw, ["annualKwh", "annualEnergyKwh", "annualGenerationKWh"], annualFromHours);
  const summary: UiSummary = {
    annualKwh,
    specificYield: numberOf(summaryRaw, ["specificYield", "specificYieldKwhKw", "specificYieldKWhPerKwp"], annualKwh / capacityKw),
    p10Kwh: numberOf(summaryRaw, ["p10Kwh", "p10GenerationKWh"], p10FromHours),
    p50Kwh: numberOf(summaryRaw, ["p50Kwh", "p50GenerationKWh"], annualKwh),
    p90Kwh: numberOf(summaryRaw, ["p90Kwh", "p90GenerationKWh"], p90FromHours),
    selfConsumptionPct: numberOf(summaryRaw, ["selfConsumptionPct"], 0),
    gridImportKwh: numberOf(summaryRaw, ["gridImportKwh", "gridImportKWh"], 0),
    gridExportKwh: numberOf(summaryRaw, ["gridExportKwh", "gridExportKWh"], 0),
    revenue: numberOf(summaryRaw, ["revenue", "netEnergyValue", "exportRevenue"], 0),
    carbonKg: numberOf(summaryRaw, ["carbonKg", "carbonAvoidedKg"], 0),
    performanceRatio: numberOf(summaryRaw, ["performanceRatio", "performanceRatioPct"], 0),
    coverage: coverageRaw <= 1.01 ? coverageRaw * 100 : coverageRaw,
    qualityScore: qualityRaw <= 1.01 ? qualityRaw * 100 : qualityRaw,
  };

  const provenance = flattenProvenance(raw.provenance);
  const assumptionsRaw = raw.assumptions ?? provenanceRaw.assumptions;
  const assumptions = Array.isArray(assumptionsRaw)
    ? assumptionsRaw.map(String)
    : typeof assumptionsRaw === "string"
      ? [assumptionsRaw]
      : [];
  const mode = typeof raw.status === "string"
    ? raw.status
    : stringOf(statusRaw, ["mode", "status", "source", "overall"], stringOf(provenanceRaw, ["mode"], "SIMULATED"));
  const primaryProvenance = provenanceList.find((item) => String(item.kind).toLowerCase() === "provider") ?? provenanceRaw;
  const modelProvenance = provenanceList.find((item) => String(item.kind).toLowerCase() === "model") ?? primaryProvenance;

  return {
    raw: snapshot,
    mode,
    hours,
    months: deriveMonths(hours),
    summary,
    config: {
      capacityKw,
      tiltDeg: numberOf(configRaw, ["tiltDeg", "tilt"], numberOf(arrayRaw, ["tiltDeg"], 30)),
      azimuthDeg: numberOf(configRaw, ["azimuthDeg", "azimuth"], numberOf(arrayRaw, ["azimuthDeg"], 180)),
      systemLossPct: systemLossRaw <= 1 ? systemLossRaw * 100 : systemLossRaw,
      batteryKwh: Math.max(0, numberOf(configRaw, ["batteryKwh", "batteryCapacityKwh", "storageKwh"], numberOf(batteryRaw, ["capacityKWh"], 0))),
      importPrice: numberOf(configRaw, ["importPrice", "importTariff", "electricityPrice"], numberOf(tariffRaw, ["importPricePerKWh"], 0.28)),
      exportPrice: numberOf(configRaw, ["exportPrice", "exportTariff"], numberOf(tariffRaw, ["exportPricePerKWh"], 0.055)),
      carbonKgPerKwh: numberOf(configRaw, ["carbonKgPerKwh", "carbonIntensityKgKwh"], numberOf(carbonRaw, ["gridIntensityKgCo2ePerKWh"], 0.182)),
      currency: stringOf(tariffRaw, ["currency"], "GBP"),
    },
    losses: normalizeLosses(raw.lossChain),
    models: normalizeModels(raw.models),
    provenance,
    provider: stringOf(primaryProvenance, ["provider", "dataProvider", "source", "name"], "Deterministic sample provider"),
    modelName: stringOf(modelProvenance, ["name", "model", "modelName", "forecastModel"], "Physics-informed ensemble"),
    issueTime: stringOf(primaryProvenance, ["issueTime", "forecastIssueTime", "issuedAt"], stringOf(statusRaw, ["generatedAt"], "Snapshot build time")),
    resolution: stringOf(primaryProvenance, ["resolution", "temporalResolution"], "1 hour"),
    units: stringOf(primaryProvenance, ["units", "unit"], "kW / kWh / W m⁻²"),
    calculationVersion: stringOf(primaryProvenance, ["calculationVersion", "calcVersion"], "solar-core/v1"),
    datasetVersion: stringOf(primaryProvenance, ["version", "datasetVersion", "snapshotId"], "sample-reproducible"),
    assumptions,
    representativeYear: recordOf(raw.representativeYear),
    optimization: recordOf(raw.optimization),
  };
}

export function scenarioEquals(a: ScenarioConfig, b: ScenarioConfig): boolean {
  return Math.abs(a.capacityKw - b.capacityKw) < 0.001
    && Math.abs(a.tiltDeg - b.tiltDeg) < 0.001
    && Math.abs(a.azimuthDeg - b.azimuthDeg) < 0.001
    && Math.abs(a.systemLossPct - b.systemLossPct) < 0.001
    && Math.abs(a.batteryKwh - b.batteryKwh) < 0.001
    && Math.abs(a.importPrice - b.importPrice) < 0.0001
    && Math.abs(a.exportPrice - b.exportPrice) < 0.0001
    && Math.abs(a.carbonKgPerKwh - b.carbonKgPerKwh) < 0.0001;
}

export function orientationScreeningScore(tiltDeg: number, azimuthDeg: number): number {
  const tiltDelta = Math.abs(tiltDeg - 32);
  const tiltScore = clamp(1 - tiltDelta * tiltDelta * 0.00022, 0.68, 1.015);
  const azimuthDelta = Math.abs((((azimuthDeg - 180) + 540) % 360) - 180);
  const azimuthScore = clamp(0.72 + 0.28 * Math.cos((azimuthDelta * Math.PI) / 180), 0.62, 1);
  return tiltScore * azimuthScore;
}

export function deriveScenario(base: NormalizedSnapshot, scenario: ScenarioConfig): ScenarioResult {
  const capacityFactor = scenario.capacityKw / Math.max(0.1, base.config.capacityKw);
  const baseOrientationScore = orientationScreeningScore(base.config.tiltDeg, base.config.azimuthDeg);
  const scenarioOrientationScore = orientationScreeningScore(scenario.tiltDeg, scenario.azimuthDeg);
  const orientationFactor = scenarioOrientationScore / Math.max(0.01, baseOrientationScore);
  const baseRetained = clamp(1 - base.config.systemLossPct / 100, 0.25, 1);
  const scenarioRetained = clamp(1 - scenario.systemLossPct / 100, 0.25, 1);
  const productionFactor = capacityFactor * orientationFactor * (scenarioRetained / baseRetained);
  const changed = !scenarioEquals(base.config, scenario);

  let soc = scenario.batteryKwh * 0.4;
  let importKwh = 0;
  let exportKwh = 0;
  let loadKwh = 0;
  let productionKwh = 0;
  const maxBatteryPower = scenario.batteryKwh > 0 ? Math.max(0.5, scenario.batteryKwh * 0.5) : 0;
  const efficiency = 0.94;

  const hours = base.hours.map((hour) => {
    const acKw = hour.acKw * productionFactor;
    const p10Kw = hour.p10Kw * productionFactor;
    const p90Kw = hour.p90Kw * productionFactor;
    const loadKw = hour.loadKw;
    const surplus = acKw - loadKw;
    let gridImportKw = 0;
    let gridExportKw = 0;
    if (surplus >= 0) {
      const chargeInput = Math.min(surplus, maxBatteryPower, Math.max(0, (scenario.batteryKwh - soc) / efficiency));
      soc = Math.min(scenario.batteryKwh, soc + chargeInput * efficiency);
      gridExportKw = Math.max(0, surplus - chargeInput);
    } else {
      const demand = -surplus;
      const dischargeOutput = Math.min(demand, maxBatteryPower, soc * efficiency);
      soc = Math.max(0, soc - dischargeOutput / efficiency);
      gridImportKw = Math.max(0, demand - dischargeOutput);
    }
    productionKwh += acKw;
    loadKwh += loadKw;
    importKwh += gridImportKw;
    exportKwh += gridExportKw;
    return {
      ...hour,
      acKw,
      p10Kw,
      p90Kw,
      socKwh: soc,
      gridImportKw,
      gridExportKw,
    };
  });

  const selfConsumed = Math.max(0, Math.min(productionKwh, productionKwh - exportKwh));
  const selfConsumptionPct = productionKwh > 0 ? (selfConsumed / productionKwh) * 100 : 0;
  const avoidedImportKwh = Math.max(0, loadKwh - importKwh);
  const revenue = avoidedImportKwh * scenario.importPrice + exportKwh * scenario.exportPrice;
  const baseP50 = base.summary.p50Kwh || base.summary.annualKwh;
  const summary: UiSummary = {
    ...base.summary,
    annualKwh: productionKwh,
    specificYield: productionKwh / Math.max(0.1, scenario.capacityKw),
    p10Kwh: base.summary.p10Kwh * productionFactor,
    p50Kwh: baseP50 * productionFactor,
    p90Kwh: base.summary.p90Kwh * productionFactor,
    selfConsumptionPct,
    gridImportKwh: importKwh,
    gridExportKwh: exportKwh,
    revenue,
    carbonKg: (selfConsumed + exportKwh) * scenario.carbonKgPerKwh,
    performanceRatio: base.summary.performanceRatio * (scenarioRetained / baseRetained),
  };

  return {
    hours,
    months: deriveMonths(hours),
    summary,
    productionFactor,
    changed,
    notes: [
      "Client-side screening approximation; not a bankable yield assessment.",
      "Fixed 94% battery round-trip leg efficiency and 0.5C dispatch limit.",
      "Tilt and azimuth response uses a bounded orientation proxy normalized to the recorded base orientation.",
    ],
  };
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits }).format(value);
}

export function formatCompact(value: number, unit = ""): string {
  if (!Number.isFinite(value)) return "—";
  const absolute = Math.abs(value);
  const scaled = absolute >= 1_000_000
    ? `${(value / 1_000_000).toFixed(2)}M`
    : absolute >= 1_000
      ? `${(value / 1_000).toFixed(1)}k`
      : value.toFixed(absolute < 10 ? 1 : 0);
  return `${scaled}${unit}`;
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}
