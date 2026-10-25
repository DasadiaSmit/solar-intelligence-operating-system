import type {
  ArrayConfig,
  HourlyOperatingPoint,
  LossChainItem,
  LossConfig,
  OperatingSnapshot,
  ProvenanceRecord,
  SolarPosition,
} from "@/lib/contracts";
import {
  FIELD_BOUNDS,
} from "@/lib/providers/conversions";
import {
  transposeToPlaneOfArray,
} from "@/lib/solar/irradiance";
import {
  calculateGenerationHour,
} from "@/lib/solar/power";
import {
  buildLossChain,
  type SolarSimulationResult,
} from "@/lib/solar/simulation";
import {
  ATMOSPHERIC_EFFECTIVE_POA_MAX_WM2,
} from "./atmospheric-observation-frame";
import {
  ARRAY_ENGINEERING_ANNUAL_RECORD_COUNT,
  ARRAY_ENGINEERING_FRAME_SCHEMA_VERSION,
  ARRAY_ENGINEERING_LINKED_DAY_SAMPLE_COUNT,
  ARRAY_ENGINEERING_LOSS_KEYS,
  ARRAY_ENGINEERING_SCREENING_CONTROLS,
  arrayEngineeringGenerationReconciles,
  arrayEngineeringIrradianceReconciles,
  arrayEngineeringNumbersReconcile,
  configuredAggregateSystemLossPct,
  deepFreezeArrayEngineeringFrame,
  type ArrayEngineeringFrameBuildResult,
  type ArrayEngineeringFrameUnavailableReason,
  type ArrayEngineeringFrameV1,
  type ArrayEngineeringQualityV1,
  type ArrayEngineeringSunSampleV1,
  type UnavailableArrayEngineeringLayerV1,
  validArrayEngineeringLossChain,
  validArrayEngineeringWeatherCalendar,
} from "./array-engineering-frame";
import {
  sunAnglesToEnu,
  type SceneLifecycle,
} from "./scene-frame";

export interface BuildArrayEngineeringFrameOptions {
  readonly snapshot: OperatingSnapshot;
  readonly resultId: string;
  readonly selectedIndex: number;
  readonly lifecycle: SceneLifecycle;
}

const VALID_LIFECYCLES = new Set<SceneLifecycle>([
  "IMPLEMENTED",
  "EXPERIMENTAL",
  "SIMULATED",
  "PLANNED",
]);
const VALID_TRACKING = new Set(["fixed", "single-axis", "dual-axis"]);
const VALID_PANEL_TECHNOLOGY = new Set([
  "mono-p",
  "mono-n",
  "thin-film",
  "bifacial-mono-n",
]);
const VALID_QUALITY_LEVELS = new Set([
  "excellent",
  "good",
  "qualified",
  "low",
]);

function failed(
  reason: ArrayEngineeringFrameUnavailableReason,
  summary: string,
): ArrayEngineeringFrameBuildResult {
  return Object.freeze({ status: "unavailable", reason, summary });
}

function unavailable(reason: string): UnavailableArrayEngineeringLayerV1 {
  return Object.freeze({ status: "unavailable", reason, value: null });
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function within(
  value: number,
  bounds: readonly [minimum: number, maximum: number],
): boolean {
  return Number.isFinite(value)
    && value >= bounds[0]
    && value <= bounds[1];
}

function validIsoTimestamp(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    && new Date(timestamp).toISOString() === value;
}

function validArrayConfig(array: ArrayConfig): boolean {
  return within(array.capacityKwDc, [0.1, 1_000_000])
    && within(array.tiltDeg, [0, 90])
    && within(array.azimuthDeg, [-180, 360])
    && VALID_TRACKING.has(array.tracking)
    && within(array.maxTrackerTiltDeg, [0, 90])
    && VALID_PANEL_TECHNOLOGY.has(array.panelTechnology)
    && within(array.bifaciality, [0, 1])
    && within(array.temperatureCoefficientPerC, [-0.02, 0])
    && within(array.degradationPerYear, [0, 0.1])
    && within(array.systemAgeYears, [0, 80])
    && within(array.dcAcRatio, [0.5, 3])
    && within(array.inverterEfficiency, [0.5, 1]);
}

function validLossConfig(losses: LossConfig): boolean {
  return ARRAY_ENGINEERING_LOSS_KEYS.every(
    (key) => within(losses[key], [0, 1]),
  );
}

function validSolarPosition(position: SolarPosition): boolean {
  const finiteValues = [
    position.elevationDeg,
    position.apparentElevationDeg,
    position.zenithDeg,
    position.azimuthDeg,
    position.declinationDeg,
    position.equationOfTimeMinutes,
    position.hourAngleDeg,
    position.extraterrestrialNormalWm2,
  ];
  const optionalTimes = [
    position.sunriseUtcMinutes,
    position.sunsetUtcMinutes,
  ];
  return finiteValues.every(Number.isFinite)
    && within(position.elevationDeg, [-90, 90])
    && within(position.apparentElevationDeg, [-90, 90])
    && within(position.zenithDeg, [0, 180])
    && within(position.azimuthDeg, [0, 360])
    && position.azimuthDeg < 360
    && within(position.declinationDeg, [-90, 90])
    && position.extraterrestrialNormalWm2 >= 0
    && optionalTimes.every(
      (value) => value === null || Number.isFinite(value),
    )
    && typeof position.isDaylight === "boolean";
}

function validWeather(
  weather: HourlyOperatingPoint["weather"],
): boolean {
  return validArrayEngineeringWeatherCalendar(weather)
    && within(weather.temperatureC, FIELD_BOUNDS.temperatureC)
    && within(weather.windSpeedMps, FIELD_BOUNDS.windSpeedMps)
    && within(
      weather.relativeHumidityPct,
      FIELD_BOUNDS.relativeHumidityPct,
    )
    && within(weather.cloudCoverPct, FIELD_BOUNDS.cloudCoverPct)
    && within(weather.precipitationMm, FIELD_BOUNDS.precipitationMm)
    && within(weather.snowDepthCm, FIELD_BOUNDS.snowDepthCm)
    && within(
      weather.surfacePressureHpa,
      FIELD_BOUNDS.surfacePressureHpa,
    )
    && within(weather.albedo, [0, 0.95])
    && within(weather.ghiWm2, FIELD_BOUNDS.ghiWm2)
    && within(weather.dniWm2, FIELD_BOUNDS.dniWm2)
    && within(weather.dhiWm2, FIELD_BOUNDS.dhiWm2);
}

function validQuality(quality: ArrayEngineeringQualityV1): boolean {
  return within(quality.score, [0, 1])
    && within(quality.completeness, [0, 1])
    && VALID_QUALITY_LEVELS.has(quality.level)
    && typeof quality.imputed === "boolean"
    && quality.flags.every(nonEmpty);
}

function validLinkedPhysics(
  point: HourlyOperatingPoint,
  array: ArrayConfig,
  losses: LossConfig,
): boolean {
  const irradiance = point.irradiance;
  const generation = point.generation;
  const irradianceValues = [
    irradiance.globalWm2,
    irradiance.directWm2,
    irradiance.diffuseWm2,
    irradiance.reflectedWm2,
    irradiance.rearWm2,
    irradiance.effectiveWm2,
  ];
  const lossFactors = generation.losses;
  const boundedLossFactors = [
    lossFactors.horizon,
    lossFactors.shading,
    lossFactors.soiling,
    lossFactors.dust,
    lossFactors.snow,
    lossFactors.mismatch,
    lossFactors.wiring,
    lossFactors.strings,
    lossFactors.availability,
    lossFactors.degradation,
    lossFactors.inverter,
  ];
  let canonicalIrradiance;
  let canonicalGeneration;
  try {
    canonicalIrradiance = transposeToPlaneOfArray(
      point.weather,
      point.sun,
      array,
    );
    canonicalGeneration = calculateGenerationHour(
      point.weather,
      canonicalIrradiance,
      array,
      losses,
    );
  } catch {
    return false;
  }
  return validWeather(point.weather)
    && point.timestamp === point.weather.timestamp
    && point.month === point.weather.month
    && point.day === point.weather.day
    && point.hour === point.weather.hour
    && irradianceValues.every(
      (value) =>
        Number.isFinite(value)
        && value >= 0
        && value <= ATMOSPHERIC_EFFECTIVE_POA_MAX_WM2,
    )
    && within(irradiance.angleOfIncidenceDeg, [0, 180])
    && within(irradiance.incidenceAngleModifier, [0, 1])
    && within(irradiance.resolvedTiltDeg, [0, 90])
    && within(irradiance.resolvedAzimuthDeg, [-180, 360])
    && (
      array.tracking !== "fixed"
      || (
        arrayEngineeringNumbersReconcile(
          irradiance.resolvedTiltDeg,
          array.tiltDeg,
        )
        && arrayEngineeringNumbersReconcile(
          irradiance.resolvedAzimuthDeg,
          array.azimuthDeg,
        )
      )
    )
    && within(generation.cellTemperatureC, [-100, 200])
    && Number.isFinite(generation.idealDcKWh)
    && generation.idealDcKWh >= 0
    && Number.isFinite(generation.dcKWh)
    && generation.dcKWh >= 0
    && Number.isFinite(generation.acKWh)
    && generation.acKWh >= 0
    && Number.isFinite(generation.acCapacityKw)
    && generation.acCapacityKw > 0
    && generation.acCapacityKw <= array.capacityKwDc
    && generation.acKWh <= generation.acCapacityKw
    && generation.acKWh <= generation.dcKWh
    && within(generation.performanceRatio, [0, 1.08])
    && within(lossFactors.temperature, [0.65, 1.08])
    && boundedLossFactors.every((value) => within(value, [0, 1]))
    && Number.isFinite(lossFactors.clippingKWh)
    && lossFactors.clippingKWh >= 0
    && arrayEngineeringIrradianceReconciles(
      irradiance,
      canonicalIrradiance,
    )
    && arrayEngineeringGenerationReconciles(
      generation,
      canonicalGeneration,
    );
}

interface AnnualReconciliation {
  readonly annualAcKWh: number;
  readonly annualDcKWh: number;
  readonly annualIdealDcKWh: number;
  readonly annualPoaKWhM2: number;
  readonly meanQualityScore: number;
  readonly peakAcKw: number;
}

function reconcileAnnualSeries(
  snapshot: OperatingSnapshot,
): AnnualReconciliation | null {
  if (snapshot.hourly.length !== ARRAY_ENGINEERING_ANNUAL_RECORD_COUNT) {
    return null;
  }
  let annualAcKWh = 0;
  let annualDcKWh = 0;
  let annualIdealDcKWh = 0;
  let annualPoaKWhM2 = 0;
  let peakAcKw = 0;
  let qualityTotal = 0;
  for (let index = 0; index < snapshot.hourly.length; index += 1) {
    const point = snapshot.hourly[index];
    if (
      !point
      || point.index !== index
      || !Number.isFinite(point.generation.acKWh)
      || point.generation.acKWh < 0
      || point.generation.acKWh > snapshot.config.array.capacityKwDc
      || !Number.isFinite(point.generation.dcKWh)
      || point.generation.dcKWh < 0
      || !Number.isFinite(point.generation.idealDcKWh)
      || point.generation.idealDcKWh < 0
      || !Number.isFinite(point.irradiance.effectiveWm2)
      || point.irradiance.effectiveWm2 < 0
      || !Number.isFinite(point.quality.score)
      || point.quality.score < 0
      || point.quality.score > 1
    ) {
      return null;
    }
    annualAcKWh += point.generation.acKWh;
    annualDcKWh += point.generation.dcKWh;
    annualIdealDcKWh += point.generation.idealDcKWh;
    annualPoaKWhM2 += point.irradiance.effectiveWm2 / 1000;
    peakAcKw = Math.max(peakAcKw, point.generation.acKWh);
    qualityTotal += point.quality.score;
  }
  return {
    annualAcKWh,
    annualDcKWh,
    annualIdealDcKWh,
    annualPoaKWhM2,
    meanQualityScore: qualityTotal / ARRAY_ENGINEERING_ANNUAL_RECORD_COUNT,
    peakAcKw,
  };
}

function validAnnualSummary(
  snapshot: OperatingSnapshot,
  annual: AnnualReconciliation,
): boolean {
  const { summary } = snapshot;
  return Object.values(summary).every(Number.isFinite)
    && summary.annualGenerationKWh >= 0
    && arrayEngineeringNumbersReconcile(
      summary.annualGenerationKWh,
      annual.annualAcKWh,
    )
    && arrayEngineeringNumbersReconcile(
      summary.annualGenerationMWh,
      summary.annualGenerationKWh / 1000,
    )
    && arrayEngineeringNumbersReconcile(
      summary.specificYieldKWhPerKwp,
      summary.annualGenerationKWh / snapshot.config.array.capacityKwDc,
    )
    && arrayEngineeringNumbersReconcile(
      summary.capacityFactorPct,
      annual.annualAcKWh
        / (
          snapshot.config.array.capacityKwDc
          * ARRAY_ENGINEERING_ANNUAL_RECORD_COUNT
        )
        * 100,
    )
    && arrayEngineeringNumbersReconcile(
      summary.performanceRatioPct,
      annual.annualIdealDcKWh > 0
        ? annual.annualAcKWh / annual.annualIdealDcKWh * 100
        : 0,
    )
    && summary.peakAcKw >= 0
    && summary.peakAcKw <= snapshot.config.array.capacityKwDc
    && arrayEngineeringNumbersReconcile(
      summary.peakAcKw,
      annual.peakAcKw,
    )
    && arrayEngineeringNumbersReconcile(
      summary.qualityScore,
      annual.meanQualityScore,
    )
    && within(summary.qualityScore, [0, 1]);
}

function canonicalLossChain(
  snapshot: OperatingSnapshot,
  annual: AnnualReconciliation,
): readonly LossChainItem[] | null {
  try {
    const simulation: SolarSimulationResult = {
      hourly: snapshot.hourly.map((point) => ({
        weather: {
          ...point.weather,
          quality: { ...point.quality, flags: [...point.quality.flags] },
        },
        position: point.sun,
        poa: point.irradiance,
        generation: point.generation,
      })),
      annualAcKWh: annual.annualAcKWh,
      annualDcKWh: annual.annualDcKWh,
      annualIdealDcKWh: annual.annualIdealDcKWh,
      annualPoaKWhM2: annual.annualPoaKWhM2,
      peakAcKw: annual.peakAcKw,
      performanceRatio: annual.annualIdealDcKWh > 0
        ? annual.annualAcKWh / annual.annualIdealDcKWh
        : 0,
    };
    return buildLossChain(simulation);
  } catch {
    return null;
  }
}

function lossChainsReconcile(
  actual: readonly LossChainItem[],
  canonical: readonly LossChainItem[],
): boolean {
  return actual.length === canonical.length
    && actual.every((item, index) => {
      const expected = canonical[index];
      return Boolean(
        expected
        && item.id === expected.id
        && item.label === expected.label
        && item.status === expected.status
        && item.explanation === expected.explanation
        && arrayEngineeringNumbersReconcile(
          item.inputKWh,
          expected.inputKWh,
        )
        && arrayEngineeringNumbersReconcile(
          item.outputKWh,
          expected.outputKWh,
        )
        && arrayEngineeringNumbersReconcile(
          item.lossKWh,
          expected.lossKWh,
        )
        && arrayEngineeringNumbersReconcile(
          item.lossPct,
          expected.lossPct,
        ),
      );
    });
}

function provenanceRecord(
  records: readonly ProvenanceRecord[],
  kind: ProvenanceRecord["kind"],
): ProvenanceRecord | null {
  return records.find((record) => record.kind === kind) ?? null;
}

function dayKey(timestampUtc: string): string {
  return timestampUtc.slice(0, 10);
}

function buildLinkedDayPath(
  snapshot: OperatingSnapshot,
  selectedIndex: number,
): readonly ArrayEngineeringSunSampleV1[] | null {
  const linked = snapshot.hourly[selectedIndex];
  if (!linked || !validIsoTimestamp(linked.timestamp)) return null;
  const key = dayKey(linked.timestamp);
  const source = snapshot.hourly
    .filter((point) => dayKey(point.timestamp) === key);
  if (source.length !== ARRAY_ENGINEERING_LINKED_DAY_SAMPLE_COUNT) {
    return null;
  }
  const firstMs = Date.parse(source[0]?.timestamp ?? "");
  if (!Number.isFinite(firstMs)) return null;
  const path: ArrayEngineeringSunSampleV1[] = [];
  for (let offset = 0; offset < source.length; offset += 1) {
    const point = source[offset];
    if (!point) return null;
    const timestampMs = Date.parse(point.timestamp);
    const directionEnu = sunAnglesToEnu(
      point.sun.apparentElevationDeg,
      point.sun.azimuthDeg,
    );
    if (
      point.index !== snapshot.hourly.indexOf(point)
      || !validIsoTimestamp(point.timestamp)
      || timestampMs !== firstMs + offset * 3_600_000
      || dayKey(point.timestamp) !== key
      || !validSolarPosition(point.sun)
      || !directionEnu
    ) {
      return null;
    }
    path.push({
      index: point.index,
      timestampUtc: point.timestamp,
      position: { ...point.sun },
      directionEnu,
    });
  }
  return path.some((sample) => sample.index === selectedIndex)
    ? path
    : null;
}

export function buildArrayEngineeringFrameV1({
  snapshot,
  resultId,
  selectedIndex,
  lifecycle,
}: BuildArrayEngineeringFrameOptions):
ArrayEngineeringFrameBuildResult {
  if (!nonEmpty(resultId) || resultId === "unidentified-result") {
    return failed(
      "invalid-result-id",
      "A stable result identifier is required for array engineering evidence.",
    );
  }
  if (!VALID_LIFECYCLES.has(lifecycle)) {
    return failed(
      "invalid-lifecycle",
      "The array engineering lifecycle is invalid.",
    );
  }
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0) {
    return failed(
      "missing-linked-hour",
      "The linked array engineering interval is unavailable.",
    );
  }
  const point = snapshot.hourly[selectedIndex];
  if (!point || point.index !== selectedIndex) {
    return failed(
      "missing-linked-hour",
      "The linked array engineering interval is unavailable.",
    );
  }
  if (!validIsoTimestamp(point.timestamp)) {
    return failed(
      "invalid-linked-time",
      "The linked array engineering timestamp is invalid.",
    );
  }
  if (!validArrayConfig(snapshot.config.array)) {
    return failed(
      "invalid-array-configuration",
      "The configured array values are invalid.",
    );
  }
  if (!validLossConfig(snapshot.config.losses)) {
    return failed(
      "invalid-loss-configuration",
      "The configured component loss inputs are invalid.",
    );
  }
  if (!validSolarPosition(point.sun)) {
    return failed(
      "invalid-sun-position",
      "The linked solar position is invalid.",
    );
  }
  const directionEnu = sunAnglesToEnu(
    point.sun.apparentElevationDeg,
    point.sun.azimuthDeg,
  );
  if (!directionEnu) {
    return failed(
      "invalid-sun-position",
      "The linked solar direction cannot be represented in ENU coordinates.",
    );
  }
  const linkedUtcDayPath = buildLinkedDayPath(snapshot, selectedIndex);
  if (!linkedUtcDayPath) {
    return failed(
      "invalid-linked-day",
      "Array Engineering requires exactly 24 contiguous attributed Sun samples for the linked UTC day.",
    );
  }
  if (!validLinkedPhysics(
    point,
    snapshot.config.array,
    snapshot.config.losses,
  )) {
    return failed(
      "invalid-linked-physics",
      "The linked irradiance or generation state is invalid.",
    );
  }
  if (!validQuality(point.quality)) {
    return failed(
      "invalid-quality",
      "The linked evidence quality record is invalid.",
    );
  }
  const annualReconciliation = reconcileAnnualSeries(snapshot);
  if (
    !annualReconciliation
    || !validAnnualSummary(snapshot, annualReconciliation)
  ) {
    return failed(
      "invalid-annual-summary",
      "The annual engineering summary is invalid or inconsistent.",
    );
  }
  const expectedLossChain = canonicalLossChain(
    snapshot,
    annualReconciliation,
  );
  if (
    !expectedLossChain
    || !validArrayEngineeringLossChain(snapshot.lossChain)
    || !lossChainsReconcile(snapshot.lossChain, expectedLossChain)
  ) {
    return failed(
      "invalid-loss-chain",
      "The annual engineering loss chain is invalid.",
    );
  }
  const provider = provenanceRecord(snapshot.provenance, "provider");
  const dataset = provenanceRecord(snapshot.provenance, "dataset");
  const calculation = provenanceRecord(snapshot.provenance, "calculation");
  if (
    !provider
    || !dataset
    || !calculation
    || !nonEmpty(provider.provider)
    || !nonEmpty(dataset.version)
    || !nonEmpty(calculation.calculationVersion)
  ) {
    return failed(
      "missing-provenance",
      "Array engineering provenance is incomplete.",
    );
  }

  const evidenceRef = (fact: string) => `evidence:${resultId}:${fact}`;
  const frame: ArrayEngineeringFrameV1 = {
    schemaVersion: ARRAY_ENGINEERING_FRAME_SCHEMA_VERSION,
    resultId,
    lifecycle,
    linkedInterval: {
      selectedIndex,
      timestampUtc: point.timestamp,
      intervalSeconds: 3600,
    },
    coordinateFrame: {
      name: "ENU",
      azimuthConvention: "clockwise-from-true-north",
      rendererMapping: "three-x-east-y-up-z-negative-north",
    },
    configurationBoundary: {
      kind: "fixed-base-configured",
      authoritativeServerRecalculationRequired: true,
      bankableYieldAssessment: false,
    },
    screening: {
      status: "screening-only",
      supportedHtmlControls: [...ARRAY_ENGINEERING_SCREENING_CONTROLS],
      aggregateSystemLossPct:
        configuredAggregateSystemLossPct(snapshot.config.losses),
      aggregateMethod:
        "multiplicative-configured-inputs-with-0.95-per-factor-screening-cap",
      authoritativeServerRecalculationRequired: true,
      bankableYieldAssessment: false,
    },
    array: {
      configured: { ...snapshot.config.array },
      resolved: {
        tiltDeg: point.irradiance.resolvedTiltDeg,
        azimuthDeg: point.irradiance.resolvedAzimuthDeg,
      },
    },
    sun: {
      source: "authoritative-linked-hour",
      directionBasis: "apparent-elevation-and-azimuth",
      position: { ...point.sun },
      directionEnu,
      linkedUtcDayPath,
      arrayConfigurationAffectsSunPath: false,
    },
    weather: { ...point.weather },
    irradiance: { ...point.irradiance },
    generation: {
      ...point.generation,
      losses: { ...point.generation.losses },
    },
    quality: {
      ...point.quality,
      flags: [...point.quality.flags],
    },
    configuredLosses: { ...snapshot.config.losses },
    annual: {
      summary: { ...snapshot.summary },
      lossChain: snapshot.lossChain.map((item) => ({ ...item })),
    },
    provenance: {
      provider: provider.provider,
      datasetVersion: dataset.version,
      calculationVersion: calculation.calculationVersion,
      evidenceRefIds: [
        evidenceRef("scenario.array-config"),
        ...ARRAY_ENGINEERING_LOSS_KEYS.map(
          (key) => evidenceRef(`scenario.loss.${key}`),
        ),
        evidenceRef("hour.sun-position"),
        evidenceRef("hour.sun-day-path"),
        evidenceRef("hour.resolved-array-orientation"),
        evidenceRef("hour.angle-of-incidence"),
        evidenceRef("hour.irradiance"),
        evidenceRef("hour.generation"),
        evidenceRef("hour.generation-loss-factors"),
        evidenceRef("hour.quality"),
        evidenceRef("annual.summary"),
        evidenceRef("annual.loss-chain"),
      ],
    },
    unavailableLayers: {
      moduleCountAndRating: unavailable(
        "No attributed module count or per-module STC rating is attached; DC capacity cannot determine module count by itself.",
      ),
      physicalArrayAndRowGeometry: unavailable(
        "No versioned module dimensions, row spacing, placement or string layout is attached.",
      ),
      namedInverterAndCurve: unavailable(
        "The scientific core uses a generic part-load inverter approximation; no named inverter, quantity or manufacturer curve is attached.",
      ),
      moduleEfficiency: unavailable(
        "No module aperture area or module-efficiency field is attached.",
      ),
      editableInverterEfficiency: unavailable(
        "Nominal inverter efficiency is configured read-only in this frame; alternative values require authoritative server recalculation.",
      ),
      physicalShadowField: unavailable(
        "Physical moving shadows require attributed array geometry, row spacing and a receiving surface; scalar shading loss is not a shadow field.",
      ),
      terrain: unavailable(
        "No versioned terrain or ground surface is attached.",
      ),
      surveyedHorizon: unavailable(
        "No surveyed horizon profile is attached; the configured horizon loss is a scalar retained-energy factor.",
      ),
      candidateHourlyProduction: unavailable(
        "No authoritative alternative-configuration hourly production series is attached to this fixed base frame.",
      ),
      measuredOrLiveOutput: unavailable(
        "The linked generation is modelled; no measured or live plant output is attached.",
      ),
      authoritativeClientSideRecalculation: unavailable(
        "Existing HTML controls are screening approximations; authoritative configuration changes require a versioned server result.",
      ),
    },
  };

  return Object.freeze({
    status: "ready",
    frame: deepFreezeArrayEngineeringFrame(frame),
  });
}
