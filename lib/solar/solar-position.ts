import type { LocationConfig, SolarPosition } from "../contracts/index";
import { clamp, DEG_TO_RAD, RAD_TO_DEG } from "./math";

const SOLAR_CONSTANT_WM2 = 1361;

function dayOfYearUtc(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

function atmosphericRefractionDegrees(elevationDeg: number): number {
  if (elevationDeg > 85) return 0;
  const tangent = Math.tan(elevationDeg * DEG_TO_RAD);
  let arcSeconds: number;
  if (elevationDeg > 5) {
    arcSeconds = 58.1 / tangent - 0.07 / tangent ** 3 + 0.000086 / tangent ** 5;
  } else if (elevationDeg > -0.575) {
    arcSeconds =
      1735 +
      elevationDeg *
        (-518.2 + elevationDeg * (103.4 + elevationDeg * (-12.79 + elevationDeg * 0.711)));
  } else {
    arcSeconds = -20.772 / tangent;
  }
  return arcSeconds / 3600;
}

/**
 * NOAA fractional-year approximation. Timestamp is interpreted as UTC. The
 * optional day override supports synthetic non-leap representative calendars.
 * Accuracy is normally within about 0.5 degrees; it is not an ephemeris.
 */
export function calculateSolarPosition(
  timestamp: string | Date,
  location: Pick<LocationConfig, "latitude" | "longitude" | "elevationM">,
  dayOverride?: number,
): SolarPosition {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid solar-position timestamp");

  const day = dayOverride ?? dayOfYearUtc(date);
  const fractionalUtcHour =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const gamma = (2 * Math.PI / 365) * (day - 1 + (fractionalUtcHour - 12) / 24);
  const equationOfTimeMinutes =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const declinationRad =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  let trueSolarMinutes =
    fractionalUtcHour * 60 + equationOfTimeMinutes + 4 * location.longitude;
  trueSolarMinutes = ((trueSolarMinutes % 1440) + 1440) % 1440;
  const hourAngleDeg = trueSolarMinutes / 4 - 180;
  const hourAngleRad = hourAngleDeg * DEG_TO_RAD;
  const latitudeRad = location.latitude * DEG_TO_RAD;

  const cosZenith = clamp(
    Math.sin(latitudeRad) * Math.sin(declinationRad) +
      Math.cos(latitudeRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad),
    -1,
    1,
  );
  const zenithDeg = Math.acos(cosZenith) * RAD_TO_DEG;
  const elevationDeg = 90 - zenithDeg;
  const apparentElevationDeg = elevationDeg + atmosphericRefractionDegrees(elevationDeg);
  const azimuthDeg =
    (Math.atan2(
      Math.sin(hourAngleRad),
      Math.cos(hourAngleRad) * Math.sin(latitudeRad) -
        Math.tan(declinationRad) * Math.cos(latitudeRad),
    ) *
      RAD_TO_DEG +
      180 +
      360) %
    360;

  const sunriseCos =
    Math.cos(90.833 * DEG_TO_RAD) /
      (Math.cos(latitudeRad) * Math.cos(declinationRad)) -
    Math.tan(latitudeRad) * Math.tan(declinationRad);
  let sunriseUtcMinutes: number | null = null;
  let sunsetUtcMinutes: number | null = null;
  if (sunriseCos >= -1 && sunriseCos <= 1) {
    const sunriseHourAngleDeg = Math.acos(sunriseCos) * RAD_TO_DEG;
    sunriseUtcMinutes =
      (720 - 4 * (location.longitude + sunriseHourAngleDeg) - equationOfTimeMinutes + 1440) %
      1440;
    sunsetUtcMinutes =
      (720 - 4 * (location.longitude - sunriseHourAngleDeg) - equationOfTimeMinutes + 1440) %
      1440;
  }

  const extraterrestrialNormalWm2 =
    SOLAR_CONSTANT_WM2 * (1 + 0.033 * Math.cos((2 * Math.PI * day) / 365));

  return {
    elevationDeg,
    apparentElevationDeg,
    zenithDeg,
    azimuthDeg,
    declinationDeg: declinationRad * RAD_TO_DEG,
    equationOfTimeMinutes,
    hourAngleDeg,
    extraterrestrialNormalWm2,
    sunriseUtcMinutes,
    sunsetUtcMinutes,
    isDaylight: apparentElevationDeg > -0.833,
  };
}

export interface ClearSkyIrradiance {
  ghiWm2: number;
  dniWm2: number;
  dhiWm2: number;
  relativeAirMass: number;
}

/** Haurwitz GHI envelope with a Kasten–Young relative air-mass DNI split. */
export function calculateClearSkyIrradiance(
  position: SolarPosition,
  elevationM = 0,
): ClearSkyIrradiance {
  if (!position.isDaylight || position.elevationDeg <= 0) {
    return { ghiWm2: 0, dniWm2: 0, dhiWm2: 0, relativeAirMass: 0 };
  }
  const cosZenith = Math.max(0.001, Math.cos(position.zenithDeg * DEG_TO_RAD));
  const relativeAirMass =
    1 /
    (cosZenith +
      0.50572 * Math.max(0.001, 96.07995 - position.zenithDeg) ** -1.6364);
  const pressureRatio = Math.exp(-Math.max(-500, elevationM) / 8434.5);
  const pressureAirMass = relativeAirMass * pressureRatio;
  const ghiWm2 = Math.max(0, 1098 * cosZenith * Math.exp(-0.059 / cosZenith));
  const beamTransmittance = Math.exp(-0.14 * pressureAirMass);
  const dniCandidate = position.extraterrestrialNormalWm2 * beamTransmittance;
  const dniWm2 = clamp(dniCandidate, 0, ghiWm2 / cosZenith);
  const dhiWm2 = Math.max(0, ghiWm2 - dniWm2 * cosZenith);
  return { ghiWm2, dniWm2, dhiWm2, relativeAirMass };
}
