import type {
  ArrayConfig,
  PlaneOfArrayIrradiance,
  SolarPosition,
  WeatherHour,
} from "../contracts/index";
import { clamp, DEG_TO_RAD, RAD_TO_DEG } from "./math";

export interface ResolvedOrientation {
  tiltDeg: number;
  azimuthDeg: number;
}

/**
 * Single-axis is a bounded geometric approximation for a horizontal north-south
 * axis. Dual-axis directly faces the sun. Backtracking and row geometry belong
 * in a site-specific engineering model.
 */
export function resolveArrayOrientation(
  position: SolarPosition,
  array: Pick<
    ArrayConfig,
    "tiltDeg" | "azimuthDeg" | "tracking" | "maxTrackerTiltDeg"
  >,
): ResolvedOrientation {
  if (!position.isDaylight || array.tracking === "fixed") {
    return { tiltDeg: array.tiltDeg, azimuthDeg: array.azimuthDeg };
  }
  if (array.tracking === "dual-axis") {
    return {
      tiltDeg: clamp(position.zenithDeg, 0, 90),
      azimuthDeg: position.azimuthDeg,
    };
  }
  const solarAzimuthRad = position.azimuthDeg * DEG_TO_RAD;
  const zenithRad = position.zenithDeg * DEG_TO_RAD;
  const trackerTilt =
    Math.atan(Math.abs(Math.tan(zenithRad) * Math.sin(solarAzimuthRad))) * RAD_TO_DEG;
  return {
    tiltDeg: clamp(trackerTilt, 0, array.maxTrackerTiltDeg),
    azimuthDeg: position.azimuthDeg < 180 ? 90 : 270,
  };
}

/** Isotropic sky-diffuse transposition with ground reflection and rear-side estimate. */
export function transposeToPlaneOfArray(
  weather: Pick<WeatherHour, "ghiWm2" | "dniWm2" | "dhiWm2" | "albedo">,
  position: SolarPosition,
  array: Pick<
    ArrayConfig,
    "tiltDeg" | "azimuthDeg" | "tracking" | "maxTrackerTiltDeg" | "bifaciality"
  >,
): PlaneOfArrayIrradiance {
  const orientation = resolveArrayOrientation(position, array);
  if (!position.isDaylight || position.elevationDeg <= 0) {
    return {
      globalWm2: 0,
      directWm2: 0,
      diffuseWm2: 0,
      reflectedWm2: 0,
      rearWm2: 0,
      effectiveWm2: 0,
      angleOfIncidenceDeg: 90,
      incidenceAngleModifier: 0,
      resolvedTiltDeg: orientation.tiltDeg,
      resolvedAzimuthDeg: orientation.azimuthDeg,
    };
  }
  const tiltRad = orientation.tiltDeg * DEG_TO_RAD;
  const zenithRad = position.zenithDeg * DEG_TO_RAD;
  const azimuthDifferenceRad =
    (position.azimuthDeg - orientation.azimuthDeg) * DEG_TO_RAD;
  const cosIncidence = clamp(
    Math.cos(zenithRad) * Math.cos(tiltRad) +
      Math.sin(zenithRad) * Math.sin(tiltRad) * Math.cos(azimuthDifferenceRad),
    -1,
    1,
  );
  const angleOfIncidenceDeg = Math.acos(cosIncidence) * RAD_TO_DEG;
  // ASHRAE incidence-angle modifier with the common generic b0=0.05.
  // Site/module calibration should replace b0 when optical test data exist.
  const incidenceAngleModifier = cosIncidence > 0
    ? clamp(1 - 0.05 * (1 / Math.max(0.001, cosIncidence) - 1), 0, 1)
    : 0;
  const directWm2 = weather.dniWm2 * Math.max(0, cosIncidence) * incidenceAngleModifier;
  const diffuseWm2 = weather.dhiWm2 * (1 + Math.cos(tiltRad)) / 2;
  const reflectedWm2 =
    weather.ghiWm2 * clamp(weather.albedo, 0, 0.95) * (1 - Math.cos(tiltRad)) / 2;
  const globalWm2 = Math.max(0, directWm2 + diffuseWm2 + reflectedWm2);
  const rearSkyView = (1 - Math.cos(tiltRad)) / 2;
  const rearGroundView = (1 + Math.cos(tiltRad)) / 2;
  const rearWm2 = Math.max(
    0,
    weather.dhiWm2 * rearSkyView * 0.65 +
      weather.ghiWm2 * weather.albedo * rearGroundView * 0.55,
  );
  const effectiveWm2 = globalWm2 + rearWm2 * clamp(array.bifaciality, 0, 1);
  return {
    globalWm2,
    directWm2,
    diffuseWm2,
    reflectedWm2,
    rearWm2,
    effectiveWm2,
    angleOfIncidenceDeg,
    incidenceAngleModifier,
    resolvedTiltDeg: orientation.tiltDeg,
    resolvedAzimuthDeg: orientation.azimuthDeg,
  };
}
