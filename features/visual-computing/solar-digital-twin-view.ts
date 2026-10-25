import {
  SCENE_FRAME_SCHEMA_VERSION,
  type SceneFrameBuildResult,
  type SceneFrameUnavailableReason,
  type SceneFrameV1,
  type UnavailableSceneLayerV1,
} from "./scene-frame";

export interface SolarDigitalTwinUnavailableLayersV1 {
  readonly arrayGeometry: UnavailableSceneLayerV1;
  readonly terrain: UnavailableSceneLayerV1;
  readonly surveyedHorizon: UnavailableSceneLayerV1;
  readonly directNormalIrradiance: UnavailableSceneLayerV1;
  readonly diffuseHorizontalIrradiance: UnavailableSceneLayerV1;
  readonly groundReflectedIrradiance: UnavailableSceneLayerV1;
}

export interface SolarDigitalTwinViewV1 {
  readonly schemaVersion: typeof SCENE_FRAME_SCHEMA_VERSION;
  readonly resultId: SceneFrameV1["resultId"];
  readonly timestampUtc: SceneFrameV1["timestampUtc"];
  readonly intervalSeconds: SceneFrameV1["intervalSeconds"];
  readonly lifecycle: SceneFrameV1["lifecycle"];
  readonly coordinateFrame: SceneFrameV1["coordinateFrame"];
  readonly site: SceneFrameV1["site"];
  readonly sun: SceneFrameV1["sun"];
  readonly irradiance: {
    readonly ghiWm2: number;
    readonly effectivePoaWm2: number;
  };
  readonly weather: SceneFrameV1["weather"];
  readonly array: {
    readonly capacityKwDc: number;
    readonly tiltDeg: number;
    readonly azimuthDeg: number;
  };
  readonly energy: SceneFrameV1["energy"];
  readonly units: SceneFrameV1["units"];
  readonly provenance: SceneFrameV1["provenance"];
  readonly unavailableLayers: SolarDigitalTwinUnavailableLayersV1;
}

export type SolarDigitalTwinViewUnavailableReason =
  | SceneFrameUnavailableReason
  | "invalid-scene-frame";

export type SolarDigitalTwinViewResult =
  | {
      readonly status: "ready";
      readonly view: SolarDigitalTwinViewV1;
    }
  | {
      readonly status: "unavailable";
      readonly reason: SolarDigitalTwinViewUnavailableReason;
      readonly summary: string;
    };

const LIFECYCLES = new Set([
  "IMPLEMENTED",
  "EXPERIMENTAL",
  "SIMULATED",
  "PLANNED",
]);

function finite(values: readonly number[]): boolean {
  return values.every(Number.isFinite);
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function validUnavailable(layer: UnavailableSceneLayerV1): boolean {
  return (
    layer.status === "unavailable"
    && layer.value === null
    && nonEmpty(layer.reason)
  );
}

function validSite(site: SceneFrameV1["site"]): boolean {
  const latitudeValid =
    site.latitudeDeg === null
    || (
      Number.isFinite(site.latitudeDeg)
      && site.latitudeDeg >= -90
      && site.latitudeDeg <= 90
    );
  const longitudeValid =
    site.longitudeDeg === null
    || (
      Number.isFinite(site.longitudeDeg)
      && site.longitudeDeg >= -180
      && site.longitudeDeg <= 180
    );
  const elevationValid =
    site.elevationM === null || Number.isFinite(site.elevationM);
  const originConsistent =
    site.originStatus === "unavailable"
      ? site.latitudeDeg === null || site.longitudeDeg === null
      : site.originStatus === "configured"
        && site.latitudeDeg !== null
        && site.longitudeDeg !== null;
  return latitudeValid && longitudeValid && elevationValid && originConsistent;
}

function validUnits(units: SceneFrameV1["units"]): boolean {
  return (
    units.angle === "deg"
    && units.irradiance === "W/m²"
    && units.intervalEnergy === "kWh/1h"
    && units.batteryState === "kWh"
    && units.temperature === "°C"
    && units.quality === "fraction"
  );
}

function validFrame(frame: SceneFrameV1): boolean {
  const numericValues = [
    frame.sun.elevationDeg,
    frame.sun.azimuthDeg,
    frame.sun.directionEnu.east,
    frame.sun.directionEnu.north,
    frame.sun.directionEnu.up,
    frame.irradiance.ghiWm2,
    frame.irradiance.effectivePoaWm2,
    frame.weather.cloudFraction,
    frame.weather.ambientTemperatureC,
    frame.weather.qualityScore,
    frame.array.capacityKwDc,
    frame.array.tiltDeg,
    frame.array.azimuthDeg,
    frame.energy.acEnergyKWh,
    frame.energy.demandEnergyKWh,
    frame.energy.batteryStateOfChargeKWh,
    frame.energy.gridImportEnergyKWh,
    frame.energy.gridExportEnergyKWh,
  ];
  const nonNegativeValues = [
    frame.irradiance.ghiWm2,
    frame.irradiance.effectivePoaWm2,
    frame.energy.acEnergyKWh,
    frame.energy.demandEnergyKWh,
    frame.energy.batteryStateOfChargeKWh,
    frame.energy.gridImportEnergyKWh,
    frame.energy.gridExportEnergyKWh,
  ];
  const unavailableLayers = [
    frame.array.geometry,
    frame.environment.terrain,
    frame.environment.surveyedHorizon,
    frame.irradiance.directNormalWm2,
    frame.irradiance.diffuseHorizontalWm2,
    frame.irradiance.groundReflectedWm2,
  ];

  return (
    frame.schemaVersion === SCENE_FRAME_SCHEMA_VERSION
    && nonEmpty(frame.resultId)
    && Number.isFinite(Date.parse(frame.timestampUtc))
    && frame.intervalSeconds === 3600
    && LIFECYCLES.has(frame.lifecycle)
    && frame.coordinateFrame.name === "ENU"
    && frame.coordinateFrame.azimuthConvention
      === "clockwise-from-true-north"
    && frame.coordinateFrame.rendererMapping
      === "three-x-east-y-up-z-negative-north"
    && validSite(frame.site)
    && frame.sun.source === "authoritative-linked-hour"
    && finite(numericValues)
    && nonNegativeValues.every((value) => value >= 0)
    && frame.sun.elevationDeg >= -90
    && frame.sun.elevationDeg <= 90
    && frame.sun.azimuthDeg >= 0
    && frame.sun.azimuthDeg < 360
    && frame.weather.cloudFraction >= 0
    && frame.weather.cloudFraction <= 1
    && frame.weather.qualityScore >= 0
    && frame.weather.qualityScore <= 1
    && frame.array.capacityKwDc > 0
    && frame.array.tiltDeg >= 0
    && frame.array.tiltDeg <= 90
    && frame.array.azimuthDeg >= 0
    && frame.array.azimuthDeg < 360
    && validUnits(frame.units)
    && nonEmpty(frame.provenance.provider)
    && nonEmpty(frame.provenance.datasetVersion)
    && nonEmpty(frame.provenance.calculationVersion)
    && frame.provenance.evidenceRefIds.length > 0
    && frame.provenance.evidenceRefIds.every(nonEmpty)
    && unavailableLayers.every(validUnavailable)
  );
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function invalidSceneFrame(): SolarDigitalTwinViewResult {
  return Object.freeze({
    status: "unavailable",
    reason: "invalid-scene-frame",
    summary:
      "The linked SceneFrameV1 is incomplete or inconsistent; the analytical HTML instruments remain authoritative.",
  });
}

export function deriveSolarDigitalTwinView(
  scene: SceneFrameBuildResult,
): SolarDigitalTwinViewResult {
  if (scene.status === "unavailable") {
    return Object.freeze({
      status: scene.status,
      reason: scene.reason,
      summary: scene.summary,
    });
  }

  try {
    const frame = scene.frame;
    if (!validFrame(frame)) return invalidSceneFrame();

    return Object.freeze({
      status: "ready",
      view: deepFreeze({
        schemaVersion: frame.schemaVersion,
        resultId: frame.resultId,
        timestampUtc: frame.timestampUtc,
        intervalSeconds: frame.intervalSeconds,
        lifecycle: frame.lifecycle,
        coordinateFrame: { ...frame.coordinateFrame },
        site: { ...frame.site },
        sun: {
          ...frame.sun,
          directionEnu: { ...frame.sun.directionEnu },
        },
        irradiance: {
          ghiWm2: frame.irradiance.ghiWm2,
          effectivePoaWm2: frame.irradiance.effectivePoaWm2,
        },
        weather: { ...frame.weather },
        array: {
          capacityKwDc: frame.array.capacityKwDc,
          tiltDeg: frame.array.tiltDeg,
          azimuthDeg: frame.array.azimuthDeg,
        },
        energy: { ...frame.energy },
        units: { ...frame.units },
        provenance: {
          ...frame.provenance,
          evidenceRefIds: [...frame.provenance.evidenceRefIds],
        },
        unavailableLayers: {
          arrayGeometry: { ...frame.array.geometry },
          terrain: { ...frame.environment.terrain },
          surveyedHorizon: { ...frame.environment.surveyedHorizon },
          directNormalIrradiance: {
            ...frame.irradiance.directNormalWm2,
          },
          diffuseHorizontalIrradiance: {
            ...frame.irradiance.diffuseHorizontalWm2,
          },
          groundReflectedIrradiance: {
            ...frame.irradiance.groundReflectedWm2,
          },
        },
      } satisfies SolarDigitalTwinViewV1),
    });
  } catch {
    return invalidSceneFrame();
  }
}
