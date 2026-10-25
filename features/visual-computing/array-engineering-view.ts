import type {
  ArrayConfig,
  LossConfig,
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
  ATMOSPHERIC_EFFECTIVE_POA_MAX_WM2,
} from "./atmospheric-observation-frame";
import {
  ARRAY_ENGINEERING_FRAME_SCHEMA_VERSION,
  ARRAY_ENGINEERING_LINKED_DAY_SAMPLE_COUNT,
  ARRAY_ENGINEERING_LOSS_KEYS,
  ARRAY_ENGINEERING_SCREENING_CONTROLS,
  ARRAY_ENGINEERING_UNAVAILABLE_LAYER_KEYS,
  arrayEngineeringGenerationReconciles,
  arrayEngineeringIrradianceReconciles,
  arrayEngineeringNumbersReconcile,
  configuredAggregateSystemLossPct,
  type ArrayEngineeringFrameBuildResult,
  type ArrayEngineeringFrameUnavailableReason,
  type ArrayEngineeringFrameV1,
  type UnavailableArrayEngineeringLayerV1,
  validArrayEngineeringLossChain,
  validArrayEngineeringWeatherCalendar,
} from "./array-engineering-frame";
import {
  sunAnglesToEnu,
  type EnuVectorV1,
} from "./scene-frame";

export type ArrayEngineeringViewV1 = ArrayEngineeringFrameV1;

export type ArrayEngineeringViewUnavailableReason =
  | ArrayEngineeringFrameUnavailableReason
  | "invalid-array-engineering-frame";

export type ArrayEngineeringViewResult =
  | { readonly status: "ready"; readonly view: ArrayEngineeringViewV1 }
  | {
      readonly status: "unavailable";
      readonly reason: ArrayEngineeringViewUnavailableReason;
      readonly summary: string;
    };

const LIFECYCLES = new Set([
  "IMPLEMENTED",
  "EXPERIMENTAL",
  "SIMULATED",
  "PLANNED",
]);
const TRACKING_MODES = new Set(["fixed", "single-axis", "dual-axis"]);
const PANEL_TECHNOLOGIES = new Set([
  "mono-p",
  "mono-n",
  "thin-film",
  "bifacial-mono-n",
]);
const QUALITY_LEVELS = new Set([
  "excellent",
  "good",
  "qualified",
  "low",
]);

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

function validDirection(
  direction: EnuVectorV1,
  position: SolarPosition,
): boolean {
  const expected = sunAnglesToEnu(
    position.apparentElevationDeg,
    position.azimuthDeg,
  );
  return Boolean(
    expected
    && arrayEngineeringNumbersReconcile(direction.east, expected.east)
    && arrayEngineeringNumbersReconcile(direction.north, expected.north)
    && arrayEngineeringNumbersReconcile(direction.up, expected.up)
    && arrayEngineeringNumbersReconcile(
      Math.hypot(direction.east, direction.north, direction.up),
      1,
    ),
  );
}

function validSolarPosition(position: SolarPosition): boolean {
  return [
    position.elevationDeg,
    position.apparentElevationDeg,
    position.zenithDeg,
    position.azimuthDeg,
    position.declinationDeg,
    position.equationOfTimeMinutes,
    position.hourAngleDeg,
    position.extraterrestrialNormalWm2,
  ].every(Number.isFinite)
    && within(position.elevationDeg, [-90, 90])
    && within(position.apparentElevationDeg, [-90, 90])
    && within(position.zenithDeg, [0, 180])
    && within(position.azimuthDeg, [0, 360])
    && position.azimuthDeg < 360
    && within(position.declinationDeg, [-90, 90])
    && position.extraterrestrialNormalWm2 >= 0
    && [position.sunriseUtcMinutes, position.sunsetUtcMinutes].every(
      (value) => value === null || Number.isFinite(value),
    )
    && typeof position.isDaylight === "boolean";
}

function sameSolarPosition(
  first: SolarPosition,
  second: SolarPosition,
): boolean {
  return first.elevationDeg === second.elevationDeg
    && first.apparentElevationDeg === second.apparentElevationDeg
    && first.zenithDeg === second.zenithDeg
    && first.azimuthDeg === second.azimuthDeg
    && first.declinationDeg === second.declinationDeg
    && first.equationOfTimeMinutes === second.equationOfTimeMinutes
    && first.hourAngleDeg === second.hourAngleDeg
    && first.extraterrestrialNormalWm2
      === second.extraterrestrialNormalWm2
    && first.sunriseUtcMinutes === second.sunriseUtcMinutes
    && first.sunsetUtcMinutes === second.sunsetUtcMinutes
    && first.isDaylight === second.isDaylight;
}

function validArray(array: ArrayConfig): boolean {
  return within(array.capacityKwDc, [0.1, 1_000_000])
    && within(array.tiltDeg, [0, 90])
    && within(array.azimuthDeg, [-180, 360])
    && TRACKING_MODES.has(array.tracking)
    && within(array.maxTrackerTiltDeg, [0, 90])
    && PANEL_TECHNOLOGIES.has(array.panelTechnology)
    && within(array.bifaciality, [0, 1])
    && within(array.temperatureCoefficientPerC, [-0.02, 0])
    && within(array.degradationPerYear, [0, 0.1])
    && within(array.systemAgeYears, [0, 80])
    && within(array.dcAcRatio, [0.5, 3])
    && within(array.inverterEfficiency, [0.5, 1]);
}

function validLosses(losses: LossConfig): boolean {
  return ARRAY_ENGINEERING_LOSS_KEYS.every(
    (key) => within(losses[key], [0, 1]),
  );
}

function validUnavailable(
  layer: UnavailableArrayEngineeringLayerV1,
): boolean {
  return layer.status === "unavailable"
    && layer.value === null
    && nonEmpty(layer.reason);
}

function validFrame(frame: ArrayEngineeringFrameV1): boolean {
  const {
    annual,
    array,
    configuredLosses,
    generation,
    irradiance,
    linkedInterval,
    quality,
    screening,
    sun,
    weather,
  } = frame;
  if (
    frame.schemaVersion !== ARRAY_ENGINEERING_FRAME_SCHEMA_VERSION
    || !nonEmpty(frame.resultId)
    || !LIFECYCLES.has(frame.lifecycle)
    || !Number.isInteger(linkedInterval.selectedIndex)
    || linkedInterval.selectedIndex < 0
    || linkedInterval.intervalSeconds !== 3600
    || !validIsoTimestamp(linkedInterval.timestampUtc)
    || frame.coordinateFrame.name !== "ENU"
    || frame.coordinateFrame.azimuthConvention
      !== "clockwise-from-true-north"
    || frame.coordinateFrame.rendererMapping
      !== "three-x-east-y-up-z-negative-north"
    || frame.configurationBoundary.kind !== "fixed-base-configured"
    || frame.configurationBoundary
      .authoritativeServerRecalculationRequired !== true
    || frame.configurationBoundary.bankableYieldAssessment !== false
    || screening.status !== "screening-only"
    || screening.aggregateMethod
      !== "multiplicative-configured-inputs-with-0.95-per-factor-screening-cap"
    || screening.authoritativeServerRecalculationRequired !== true
    || screening.bankableYieldAssessment !== false
    || screening.supportedHtmlControls.length
      !== ARRAY_ENGINEERING_SCREENING_CONTROLS.length
    || screening.supportedHtmlControls.some(
      (control, index) =>
        control !== ARRAY_ENGINEERING_SCREENING_CONTROLS[index],
    )
    || !validArray(array.configured)
    || !validLosses(configuredLosses)
    || !arrayEngineeringNumbersReconcile(
      screening.aggregateSystemLossPct,
      configuredAggregateSystemLossPct(configuredLosses),
    )
    || !within(array.resolved.tiltDeg, [0, 90])
    || !within(array.resolved.azimuthDeg, [-180, 360])
    || (
      array.configured.tracking === "fixed"
      && (
        !arrayEngineeringNumbersReconcile(
          array.resolved.tiltDeg,
          array.configured.tiltDeg,
        )
        || !arrayEngineeringNumbersReconcile(
          array.resolved.azimuthDeg,
          array.configured.azimuthDeg,
        )
      )
    )
    || sun.source !== "authoritative-linked-hour"
    || sun.directionBasis !== "apparent-elevation-and-azimuth"
    || sun.arrayConfigurationAffectsSunPath !== false
    || !validSolarPosition(sun.position)
    || !validDirection(sun.directionEnu, sun.position)
    || sun.linkedUtcDayPath.length
      !== ARRAY_ENGINEERING_LINKED_DAY_SAMPLE_COUNT
  ) {
    return false;
  }

  const firstSample = sun.linkedUtcDayPath[0];
  if (!firstSample) return false;
  const firstMs = Date.parse(firstSample.timestampUtc);
  const day = firstSample.timestampUtc.slice(0, 10);
  let linkedSampleFound = false;
  for (
    let offset = 0;
    offset < sun.linkedUtcDayPath.length;
    offset += 1
  ) {
    const sample = sun.linkedUtcDayPath[offset];
    if (
      !sample
      || !Number.isInteger(sample.index)
      || !validIsoTimestamp(sample.timestampUtc)
      || Date.parse(sample.timestampUtc) !== firstMs + offset * 3_600_000
      || sample.timestampUtc.slice(0, 10) !== day
      || !validSolarPosition(sample.position)
      || !validDirection(sample.directionEnu, sample.position)
    ) {
      return false;
    }
    if (sample.index === linkedInterval.selectedIndex) {
      linkedSampleFound =
        sample.timestampUtc === linkedInterval.timestampUtc
        && sameSolarPosition(sample.position, sun.position);
    }
  }
  if (!linkedSampleFound) return false;

  const weatherValid = weather.timestamp === linkedInterval.timestampUtc
    && validArrayEngineeringWeatherCalendar(weather)
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
  const irradianceValues = [
    irradiance.globalWm2,
    irradiance.directWm2,
    irradiance.diffuseWm2,
    irradiance.reflectedWm2,
    irradiance.rearWm2,
    irradiance.effectiveWm2,
  ];
  const canonicalIrradiance = transposeToPlaneOfArray(
    weather,
    sun.position,
    array.configured,
  );
  const canonicalGeneration = calculateGenerationHour(
    weather,
    canonicalIrradiance,
    array.configured,
    configuredLosses,
  );
  const irradianceValid = irradianceValues.every(
    (value) =>
      Number.isFinite(value)
      && value >= 0
      && value <= ATMOSPHERIC_EFFECTIVE_POA_MAX_WM2,
  )
    && within(irradiance.angleOfIncidenceDeg, [0, 180])
    && within(irradiance.incidenceAngleModifier, [0, 1])
    && irradiance.resolvedTiltDeg === array.resolved.tiltDeg
    && irradiance.resolvedAzimuthDeg === array.resolved.azimuthDeg
    && arrayEngineeringIrradianceReconciles(
      irradiance,
      canonicalIrradiance,
    );
  const boundedLossFactors = [
    generation.losses.horizon,
    generation.losses.shading,
    generation.losses.soiling,
    generation.losses.dust,
    generation.losses.snow,
    generation.losses.mismatch,
    generation.losses.wiring,
    generation.losses.strings,
    generation.losses.availability,
    generation.losses.degradation,
    generation.losses.inverter,
  ];
  const generationValid =
    within(generation.cellTemperatureC, [-100, 200])
    && Number.isFinite(generation.idealDcKWh)
    && generation.idealDcKWh >= 0
    && Number.isFinite(generation.dcKWh)
    && generation.dcKWh >= 0
    && Number.isFinite(generation.acKWh)
    && generation.acKWh >= 0
    && Number.isFinite(generation.acCapacityKw)
    && generation.acCapacityKw > 0
    && generation.acCapacityKw <= array.configured.capacityKwDc
    && generation.acKWh <= generation.acCapacityKw
    && generation.acKWh <= generation.dcKWh
    && within(generation.performanceRatio, [0, 1.08])
    && within(generation.losses.temperature, [0.65, 1.08])
    && boundedLossFactors.every((value) => within(value, [0, 1]))
    && Number.isFinite(generation.losses.clippingKWh)
    && generation.losses.clippingKWh >= 0
    && arrayEngineeringGenerationReconciles(
      generation,
      canonicalGeneration,
    );
  const qualityValid = within(quality.score, [0, 1])
    && within(quality.completeness, [0, 1])
    && QUALITY_LEVELS.has(quality.level)
    && typeof quality.imputed === "boolean"
    && quality.flags.every(nonEmpty);
  const summary = annual.summary;
  const summaryValid = Object.values(summary).every(Number.isFinite)
    && summary.annualGenerationKWh >= 0
    && arrayEngineeringNumbersReconcile(
      summary.annualGenerationMWh,
      summary.annualGenerationKWh / 1000,
    )
    && arrayEngineeringNumbersReconcile(
      summary.specificYieldKWhPerKwp,
      summary.annualGenerationKWh / array.configured.capacityKwDc,
    )
    && summary.peakAcKw >= 0
    && summary.peakAcKw <= array.configured.capacityKwDc
    && within(summary.qualityScore, [0, 1]);
  const lossChainValid =
    validArrayEngineeringLossChain(annual.lossChain);
  const evidenceRefs = frame.provenance.evidenceRefIds;
  const provenanceValid = nonEmpty(frame.provenance.provider)
    && nonEmpty(frame.provenance.datasetVersion)
    && nonEmpty(frame.provenance.calculationVersion)
    && evidenceRefs.length > 0
    && evidenceRefs.every(nonEmpty)
    && new Set(evidenceRefs).size === evidenceRefs.length;
  const unavailableKeys = Object.keys(frame.unavailableLayers);
  const unavailableValid =
    unavailableKeys.length === ARRAY_ENGINEERING_UNAVAILABLE_LAYER_KEYS.length
    && ARRAY_ENGINEERING_UNAVAILABLE_LAYER_KEYS.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(frame.unavailableLayers, key)
        && validUnavailable(frame.unavailableLayers[key]),
    );

  return weatherValid
    && irradianceValid
    && generationValid
    && qualityValid
    && summaryValid
    && lossChainValid
    && provenanceValid
    && unavailableValid;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function cloneFrame(
  frame: ArrayEngineeringFrameV1,
): ArrayEngineeringViewV1 {
  return deepFreeze({
    ...frame,
    linkedInterval: { ...frame.linkedInterval },
    coordinateFrame: { ...frame.coordinateFrame },
    configurationBoundary: { ...frame.configurationBoundary },
    screening: {
      ...frame.screening,
      supportedHtmlControls: [...frame.screening.supportedHtmlControls],
    },
    array: {
      configured: { ...frame.array.configured },
      resolved: { ...frame.array.resolved },
    },
    sun: {
      ...frame.sun,
      position: { ...frame.sun.position },
      directionEnu: { ...frame.sun.directionEnu },
      linkedUtcDayPath: frame.sun.linkedUtcDayPath.map((sample) => ({
        ...sample,
        position: { ...sample.position },
        directionEnu: { ...sample.directionEnu },
      })),
    },
    weather: { ...frame.weather },
    irradiance: { ...frame.irradiance },
    generation: {
      ...frame.generation,
      losses: { ...frame.generation.losses },
    },
    quality: {
      ...frame.quality,
      flags: [...frame.quality.flags],
    },
    configuredLosses: { ...frame.configuredLosses },
    annual: {
      summary: { ...frame.annual.summary },
      lossChain: frame.annual.lossChain.map((item) => ({ ...item })),
    },
    provenance: {
      ...frame.provenance,
      evidenceRefIds: [...frame.provenance.evidenceRefIds],
    },
    unavailableLayers: Object.fromEntries(
      Object.entries(frame.unavailableLayers).map(
        ([key, layer]) => [key, { ...layer }],
      ),
    ) as unknown as ArrayEngineeringFrameV1["unavailableLayers"],
  } satisfies ArrayEngineeringViewV1);
}

export function deriveArrayEngineeringView(
  result: ArrayEngineeringFrameBuildResult,
): ArrayEngineeringViewResult {
  if (result.status === "unavailable") {
    return Object.freeze({ ...result });
  }
  try {
    if (!validFrame(result.frame)) {
      return Object.freeze({
        status: "unavailable",
        reason: "invalid-array-engineering-frame",
        summary:
          "The array engineering frame is incomplete or inconsistent; the analytical HTML workspace remains authoritative.",
      });
    }
    return Object.freeze({
      status: "ready",
      view: cloneFrame(result.frame),
    });
  } catch {
    return Object.freeze({
      status: "unavailable",
      reason: "invalid-array-engineering-frame",
      summary:
        "The array engineering frame is incomplete or inconsistent; the analytical HTML workspace remains authoritative.",
    });
  }
}
