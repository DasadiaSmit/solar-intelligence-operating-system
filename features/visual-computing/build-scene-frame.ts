import {
  numberOf,
  recordOf,
  type NormalizedSnapshot,
  type ScenarioConfig,
  type ScenarioResult,
} from "@/components/solar-os/model";
import {
  SCENE_FRAME_SCHEMA_VERSION,
  deepFreezeSceneFrame,
  sunAnglesToEnu,
  type SceneFrameBuildResult,
  type SceneFrameUnavailableReason,
  type SceneFrameV1,
  type SceneLifecycle,
  type UnavailableSceneLayerV1,
} from "./scene-frame";

interface BuildSceneFrameOptions {
  readonly base: NormalizedSnapshot;
  readonly result: ScenarioResult;
  readonly scenario: ScenarioConfig;
  readonly selectedIndex: number;
  readonly lifecycle: SceneLifecycle;
}

const unavailable = (reason: string): UnavailableSceneLayerV1 => ({
  status: "unavailable",
  reason,
  value: null,
});

function failed(
  reason: SceneFrameUnavailableReason,
  summary: string,
): SceneFrameBuildResult {
  return { status: "unavailable", reason, summary };
}

function finite(values: readonly number[]): boolean {
  return values.every(Number.isFinite);
}

function evidenceRef(resultId: string, factKey: string): string {
  return `evidence:${resultId}:${factKey}`;
}

function configuredCoordinate(
  value: number,
  minimum: number,
  maximum: number,
): number | null {
  return Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : null;
}

export function buildSceneFrameV1({
  base,
  result,
  scenario,
  selectedIndex,
  lifecycle,
}: BuildSceneFrameOptions): SceneFrameBuildResult {
  const hour = result.hours[selectedIndex];
  if (!hour) {
    return failed(
      "missing-linked-hour",
      "The linked hour is unavailable; the analytical HTML instruments remain active.",
    );
  }
  if (!Number.isFinite(Date.parse(hour.timestamp))) {
    return failed(
      "invalid-linked-time",
      "The linked timestamp is invalid; no spatial scene has been produced.",
    );
  }

  const directionEnu = sunAnglesToEnu(
    hour.sunElevationDeg,
    hour.sunAzimuthDeg,
  );
  if (!directionEnu) {
    return failed(
      "invalid-solar-position",
      "The linked solar position is invalid; no spatial scene has been produced.",
    );
  }

  const sceneValues = [
    hour.ghi,
    hour.poa,
    hour.tempC,
    hour.cloud,
    hour.quality,
    hour.acKw,
    hour.loadKw,
    hour.socKwh,
    hour.gridImportKw,
    hour.gridExportKw,
    scenario.capacityKw,
    scenario.tiltDeg,
    scenario.azimuthDeg,
  ];
  const nonNegativeSceneValues = [
    hour.ghi,
    hour.poa,
    hour.acKw,
    hour.loadKw,
    hour.socKwh,
    hour.gridImportKw,
    hour.gridExportKw,
  ];
  if (
    !finite(sceneValues)
    || nonNegativeSceneValues.some((value) => value < 0)
    || hour.cloud < 0
    || hour.cloud > 1
    || hour.quality < 0
    || hour.quality > 1
    || scenario.capacityKw <= 0
    || scenario.tiltDeg < 0
    || scenario.tiltDeg > 90
    || scenario.azimuthDeg < 0
    || scenario.azimuthDeg >= 360
  ) {
    return failed(
      "invalid-scene-value",
      "One or more linked scene values are invalid; no mesh coordinates have been produced.",
    );
  }
  if (
    !base.resultId
    || base.resultId === "unidentified-result"
    || !base.provider
    || !base.datasetVersion
    || !base.calculationVersion
  ) {
    return failed(
      "missing-provenance",
      "Scene provenance is incomplete; the analytical HTML instruments remain authoritative.",
    );
  }

  const rawConfig = recordOf(
    (base.raw as unknown as Record<string, unknown>).config,
  );
  const location = recordOf(rawConfig.location);
  const latitudeDeg = configuredCoordinate(
    numberOf(location, ["latitude", "latitudeDeg"], Number.NaN),
    -90,
    90,
  );
  const longitudeDeg = configuredCoordinate(
    numberOf(location, ["longitude", "longitudeDeg"], Number.NaN),
    -180,
    180,
  );
  const elevation = numberOf(
    location,
    ["elevationM", "altitudeM"],
    Number.NaN,
  );
  const elevationM = Number.isFinite(elevation) ? elevation : null;
  const transport = recordOf(
    (base.raw as unknown as Record<string, unknown>).transport,
  );
  const intervalSeconds = numberOf(transport, ["intervalSeconds"], 3600);
  if (intervalSeconds !== 3600) {
    return failed(
      "invalid-scene-value",
      "The current renderer accepts only the versioned one-hour browser transport.",
    );
  }

  const frame: SceneFrameV1 = {
    schemaVersion: SCENE_FRAME_SCHEMA_VERSION,
    resultId: base.resultId,
    timestampUtc: hour.timestamp,
    intervalSeconds,
    lifecycle,
    coordinateFrame: {
      name: "ENU",
      azimuthConvention: "clockwise-from-true-north",
      rendererMapping: "three-x-east-y-up-z-negative-north",
    },
    site: {
      latitudeDeg,
      longitudeDeg,
      elevationM,
      originStatus:
        latitudeDeg === null || longitudeDeg === null
          ? "unavailable"
          : "configured",
    },
    sun: {
      elevationDeg: hour.sunElevationDeg,
      azimuthDeg: ((hour.sunAzimuthDeg % 360) + 360) % 360,
      directionEnu,
      source: "authoritative-linked-hour",
    },
    irradiance: {
      ghiWm2: hour.ghi,
      effectivePoaWm2: hour.poa,
      directNormalWm2: unavailable(
        "The compact browser transport does not carry direct normal irradiance.",
      ),
      diffuseHorizontalWm2: unavailable(
        "The compact browser transport does not carry diffuse horizontal irradiance.",
      ),
      groundReflectedWm2: unavailable(
        "No attributed ground-reflection layer is present.",
      ),
    },
    weather: {
      cloudFraction: hour.cloud,
      ambientTemperatureC: hour.tempC,
      qualityScore: hour.quality,
    },
    array: {
      capacityKwDc: scenario.capacityKw,
      tiltDeg: scenario.tiltDeg,
      azimuthDeg: scenario.azimuthDeg,
      geometry: unavailable(
        "Module count, dimensions, row spacing and surveyed placement are not available.",
      ),
    },
    energy: {
      acEnergyKWh: hour.acKw,
      demandEnergyKWh: hour.loadKw,
      batteryStateOfChargeKWh: hour.socKwh,
      gridImportEnergyKWh: hour.gridImportKw,
      gridExportEnergyKWh: hour.gridExportKw,
    },
    environment: {
      terrain: unavailable(
        "No versioned terrain surface is attached to this result.",
      ),
      surveyedHorizon: unavailable(
        "No surveyed horizon profile is attached to this result.",
      ),
    },
    units: {
      angle: "deg",
      irradiance: "W/m²",
      intervalEnergy: "kWh/1h",
      batteryState: "kWh",
      temperature: "°C",
      quality: "fraction",
    },
    provenance: {
      provider: base.provider,
      datasetVersion: base.datasetVersion,
      calculationVersion: base.calculationVersion,
      evidenceRefIds: [
        evidenceRef(base.resultId, "hour.sun-elevation"),
        evidenceRef(base.resultId, "hour.sun-azimuth"),
        evidenceRef(base.resultId, "hour.ghi"),
        evidenceRef(base.resultId, "hour.poa"),
        evidenceRef(base.resultId, "hour.cloud"),
        evidenceRef(base.resultId, "hour.temperature"),
        evidenceRef(base.resultId, "hour.quality"),
        evidenceRef(base.resultId, "hour.ac"),
        evidenceRef(base.resultId, "hour.battery-soc"),
        evidenceRef(base.resultId, "hour.grid-import"),
        evidenceRef(base.resultId, "hour.grid-export"),
        evidenceRef(base.resultId, "scenario.capacity"),
        evidenceRef(base.resultId, "scenario.tilt"),
        evidenceRef(base.resultId, "scenario.azimuth"),
      ],
    },
  };

  return { status: "ready", frame: deepFreezeSceneFrame(frame) };
}
