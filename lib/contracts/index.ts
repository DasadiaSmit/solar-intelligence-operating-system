/**
 * Stable, serialisable contracts shared by the scientific core, APIs and UI.
 * Internal calculations use SI units; energy is expressed as kWh at boundaries.
 */

export const CALCULATION_VERSION = "sios-physics-1.0.0";
export const DATASET_VERSION = "sios-sample-eu-2022-2025-v1";
export const MODEL_VERSION = "sios-request-models-1.0.0";

export type LifecycleStatus =
  | "implemented"
  | "experimental"
  | "simulated"
  | "planned";

export type TrackingMode = "fixed" | "single-axis" | "dual-axis";
export type PanelTechnology =
  | "mono-p"
  | "mono-n"
  | "thin-film"
  | "bifacial-mono-n";

export type DataQualityLevel = "excellent" | "good" | "qualified" | "low";

export interface QualityAssessment {
  score: number;
  level: DataQualityLevel;
  completeness: number;
  imputed: boolean;
  flags: string[];
}

export interface LocationConfig {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  timezone: string;
  standardUtcOffsetMinutes: number;
}

export interface ArrayConfig {
  capacityKwDc: number;
  tiltDeg: number;
  azimuthDeg: number;
  tracking: TrackingMode;
  maxTrackerTiltDeg: number;
  panelTechnology: PanelTechnology;
  bifaciality: number;
  temperatureCoefficientPerC: number;
  degradationPerYear: number;
  systemAgeYears: number;
  dcAcRatio: number;
  inverterEfficiency: number;
}

export interface LossConfig {
  horizon: number;
  shading: number;
  soiling: number;
  dust: number;
  snow: number;
  mismatch: number;
  wiring: number;
  strings: number;
  availability: number;
  curtailment: number;
}

export interface BatteryConfig {
  enabled: boolean;
  capacityKWh: number;
  maxChargeKw: number;
  maxDischargeKw: number;
  minSocFraction: number;
  maxSocFraction: number;
  initialSocFraction: number;
  chargeEfficiency: number;
  dischargeEfficiency: number;
  selfDischargePerHour: number;
  reserveFraction: number;
}

export interface TariffConfig {
  currency: "GBP" | "EUR" | "USD";
  importPricePerKWh: number;
  peakImportPricePerKWh: number;
  peakStartHour: number;
  peakEndHour: number;
  exportPricePerKWh: number;
  annualFixedCost: number;
  gridExportLimitKw: number;
}

export interface DemandConfig {
  annualDemandKWh: number;
  profile: "residential" | "commercial" | "flat";
  weekendFraction: number;
}

export interface CarbonConfig {
  gridIntensityKgCo2ePerKWh: number;
  exportDisplacementFactor: number;
  embodiedCarbonKgCo2ePerKwp: number;
}

export interface SystemConfig {
  location: LocationConfig;
  array: ArrayConfig;
  losses: LossConfig;
  battery: BatteryConfig;
  tariff: TariffConfig;
  demand: DemandConfig;
  carbon: CarbonConfig;
  weatherScenario: "representative" | "sunny" | "cloudy" | "heatwave" | "storm";
  seed: number;
}

export interface WeatherHour {
  timestamp: string;
  sourceTimestamp: string;
  sourceYear: 2022 | 2023 | 2024 | 2025;
  dayOfYear: number;
  month: number;
  day: number;
  hour: number;
  temperatureC: number;
  windSpeedMps: number;
  relativeHumidityPct: number;
  cloudCoverPct: number;
  precipitationMm: number;
  snowDepthCm: number;
  surfacePressureHpa: number;
  albedo: number;
  ghiWm2: number;
  dniWm2: number;
  dhiWm2: number;
  quality: QualityAssessment;
}

export interface SolarPosition {
  elevationDeg: number;
  apparentElevationDeg: number;
  zenithDeg: number;
  azimuthDeg: number;
  declinationDeg: number;
  equationOfTimeMinutes: number;
  hourAngleDeg: number;
  extraterrestrialNormalWm2: number;
  sunriseUtcMinutes: number | null;
  sunsetUtcMinutes: number | null;
  isDaylight: boolean;
}

export interface PlaneOfArrayIrradiance {
  globalWm2: number;
  directWm2: number;
  diffuseWm2: number;
  reflectedWm2: number;
  rearWm2: number;
  effectiveWm2: number;
  angleOfIncidenceDeg: number;
  incidenceAngleModifier: number;
  resolvedTiltDeg: number;
  resolvedAzimuthDeg: number;
}

export interface HourlyLossFactors {
  temperature: number;
  horizon: number;
  shading: number;
  soiling: number;
  dust: number;
  snow: number;
  mismatch: number;
  wiring: number;
  strings: number;
  availability: number;
  degradation: number;
  inverter: number;
  clippingKWh: number;
}

export interface GenerationHour {
  cellTemperatureC: number;
  idealDcKWh: number;
  dcKWh: number;
  acKWh: number;
  acCapacityKw: number;
  performanceRatio: number;
  losses: HourlyLossFactors;
}

export interface EnergyFlowHour {
  demandKWh: number;
  solarToLoadKWh: number;
  batteryChargeKWh: number;
  batteryDischargeKWh: number;
  batterySocKWh: number;
  gridImportKWh: number;
  gridExportKWh: number;
  curtailedKWh: number;
  importCost: number;
  exportRevenue: number;
  carbonAvoidedKg: number;
}

export interface PredictionInterval {
  p10KWh: number;
  p50KWh: number;
  p90KWh: number;
  confidence: number;
}

export type WeatherRegime =
  | "clear"
  | "variable-cloud"
  | "overcast"
  | "wet"
  | "snow"
  | "night";

export interface HourlyOperatingPoint {
  index: number;
  timestamp: string;
  sourceTimestamp: string;
  sourceYear: number;
  month: number;
  day: number;
  hour: number;
  sun: SolarPosition;
  weather: Omit<WeatherHour, "quality">;
  irradiance: PlaneOfArrayIrradiance;
  generation: GenerationHour;
  flow: EnergyFlowHour;
  forecast: PredictionInterval;
  quality: QualityAssessment;
  regime: WeatherRegime;
}

export interface HistoricalYearComparison {
  year: 2022 | 2023 | 2024 | 2025;
  generationKWh: number;
  specificYieldKWhPerKwp: number;
  deltaFromRepresentativePct: number;
  meanQualityScore: number;
}

export interface MonthlyOperatingSummary {
  month: number;
  label: string;
  generationKWh: number;
  demandKWh: number;
  selfConsumedKWh: number;
  gridImportKWh: number;
  gridExportKWh: number;
  irradianceKWhM2: number;
  carbonAvoidedKg: number;
  p10KWh: number;
  p90KWh: number;
  historicalGenerationKWh: Record<"2022" | "2023" | "2024" | "2025", number>;
}

export interface OperatingSummary {
  annualGenerationKWh: number;
  annualGenerationMWh: number;
  specificYieldKWhPerKwp: number;
  capacityFactorPct: number;
  performanceRatioPct: number;
  p10GenerationKWh: number;
  p90GenerationKWh: number;
  annualDemandKWh: number;
  selfConsumedKWh: number;
  selfConsumptionPct: number;
  solarFractionPct: number;
  gridImportKWh: number;
  gridExportKWh: number;
  curtailedKWh: number;
  batteryCycles: number;
  importCost: number;
  exportRevenue: number;
  netEnergyValue: number;
  carbonAvoidedKg: number;
  carbonPaybackYears: number;
  reliabilityPct: number;
  peakAcKw: number;
  qualityScore: number;
}

export interface LossChainItem {
  id: string;
  label: string;
  inputKWh: number;
  outputKWh: number;
  lossKWh: number;
  lossPct: number;
  status: LifecycleStatus;
  explanation: string;
}

export interface ValidationMetrics {
  sampleCount: number;
  mae: number;
  rmse: number;
  mapePct: number | null;
  normalizedMaePct: number;
  bias: number;
  rSquared: number;
  seasonalMae: Record<"winter" | "spring" | "summer" | "autumn", number>;
  annualGenerationErrorPct: number;
  peakOutputErrorPct: number;
  intervalCoveragePct: number | null;
  calibrationErrorPct: number | null;
}

export interface ModelRecord {
  id: string;
  name: string;
  family: "baseline" | "statistical" | "machine-learning" | "physical" | "hybrid" | "probabilistic";
  version: string;
  status: LifecycleStatus;
  role: "champion" | "challenger" | "reference" | "research-candidate";
  trainedThrough: string | null;
  metrics: ValidationMetrics | null;
  description: string;
  limitations: string[];
}

export interface RepresentativeMonthRecord {
  month: number;
  sourceYearWeights: Record<"2022" | "2023" | "2024" | "2025", number>;
  irradiancePercentileDeviation: number;
  temperatureDeviationC: number;
  continuityPenalty: number;
  regimeCounts: Record<string, number>;
}

export interface RepresentativeYearRecord {
  id: string;
  method: string;
  status: LifecycleStatus;
  sourceYears: number[];
  hours: number;
  sourceYearWeights: Record<"2022" | "2023" | "2024" | "2025", number>;
  monthlyConstruction: RepresentativeMonthRecord[];
  comparisons: HistoricalYearComparison[];
  assumptions: string[];
  uncertaintyMethod: string;
}

export interface OptimisationCandidate {
  id: string;
  tiltDeg: number;
  azimuthDeg: number;
  dcAcRatio: number;
  batteryKWh: number;
  annualGenerationKWh: number;
  selfConsumptionPct: number;
  revenue: number;
  carbonAvoidedKg: number;
  curtailedKWh: number;
  score: number;
  paretoOptimal: boolean;
}

export interface MonteCarloSummary {
  trials: number;
  seed: number;
  p05GenerationKWh: number;
  p50GenerationKWh: number;
  p95GenerationKWh: number;
  coefficientOfVariationPct: number;
  sensitivities: Array<{ input: string; correlation: number }>;
}

export interface StressScenarioResult {
  id: string;
  label: string;
  status: LifecycleStatus;
  generationDeltaPct: number;
  revenueDeltaPct: number;
  reliabilityDeltaPct: number;
  explanation: string;
}

export interface OptimisationRecord {
  status: LifecycleStatus;
  method: string;
  objective: string;
  evaluatedCandidates: number;
  baseline: OptimisationCandidate;
  recommended: OptimisationCandidate;
  paretoFront: OptimisationCandidate[];
  terrain: OptimisationCandidate[];
  monteCarlo: MonteCarloSummary;
  stressScenarios: StressScenarioResult[];
  plannedMethods: string[];
}

export interface ProvenanceRecord {
  id: string;
  kind: "dataset" | "provider" | "transformation" | "calculation" | "model" | "scenario";
  name: string;
  version: string;
  status: LifecycleStatus;
  provider: string;
  issueTime: string;
  dataTimestamp: string;
  resolution: string;
  units: string;
  quality: QualityAssessment;
  calculationVersion: string;
  assumptions: string[];
  uncertainty: string;
  parentIds: string[];
  reproducibilityKey: string;
}

export interface CapabilityStatus {
  id: string;
  label: string;
  status: LifecycleStatus;
  detail: string;
}

export interface OperatingStatus {
  overall: LifecycleStatus;
  generatedAt: string;
  deterministic: boolean;
  offlineCapable: boolean;
  guaranteeNotice: string;
  capabilities: CapabilityStatus[];
  warnings: string[];
}

export interface OperatingSnapshot {
  summary: OperatingSummary;
  config: SystemConfig;
  hourly: HourlyOperatingPoint[];
  monthly: MonthlyOperatingSummary[];
  lossChain: LossChainItem[];
  models: ModelRecord[];
  representativeYear: RepresentativeYearRecord;
  optimization: OptimisationRecord;
  provenance: ProvenanceRecord[];
  status: OperatingStatus;
}

export function qualityLevel(score: number): DataQualityLevel {
  if (score >= 0.95) return "excellent";
  if (score >= 0.85) return "good";
  if (score >= 0.7) return "qualified";
  return "low";
}

export function makeQuality(
  score: number,
  flags: string[] = [],
  completeness = 1,
  imputed = false,
): QualityAssessment {
  const bounded = Math.max(0, Math.min(1, score));
  return {
    score: bounded,
    level: qualityLevel(bounded),
    completeness: Math.max(0, Math.min(1, completeness)),
    imputed,
    flags,
  };
}
