import type { CanonicalWeatherField } from "./types";

export function temperatureToCelsius(value: number, unit: string | undefined): number {
  const normalised = unit?.toLowerCase().replaceAll(" ", "") ?? "°c";
  if (["°f", "f", "fahrenheit"].includes(normalised)) return (value - 32) * (5 / 9);
  if (["k", "kelvin"].includes(normalised)) return value - 273.15;
  return value;
}

export function speedToMetresPerSecond(value: number, unit: string | undefined): number {
  const normalised = unit?.toLowerCase().replaceAll(" ", "") ?? "m/s";
  if (["km/h", "kmh", "kph"].includes(normalised)) return value / 3.6;
  if (["mph", "mi/h"].includes(normalised)) return value * 0.44704;
  if (["kn", "kt", "knots"].includes(normalised)) return value * 0.514444;
  return value;
}

export function pressureToHpa(value: number, unit: string | undefined): number {
  const normalised = unit?.toLowerCase().replaceAll(" ", "") ?? "hpa";
  if (["pa", "pascal", "pascals"].includes(normalised)) return value / 100;
  if (["kpa"].includes(normalised)) return value * 10;
  return value;
}

export function depthToCentimetres(value: number, unit: string | undefined): number {
  const normalised = unit?.toLowerCase().replaceAll(" ", "") ?? "cm";
  if (["m", "metre", "meter"].includes(normalised)) return value * 100;
  if (["mm", "millimetre", "millimeter"].includes(normalised)) return value / 10;
  if (["in", "inch", "inches"].includes(normalised)) return value * 2.54;
  return value;
}

export function precipitationToMillimetres(value: number, unit: string | undefined): number {
  const normalised = unit?.toLowerCase().replaceAll(" ", "") ?? "mm";
  if (["cm"].includes(normalised)) return value * 10;
  if (["in", "inch", "inches"].includes(normalised)) return value * 25.4;
  return value;
}

export const FIELD_BOUNDS: Record<CanonicalWeatherField, [number, number]> = {
  temperatureC: [-90, 65],
  relativeHumidityPct: [0, 100],
  cloudCoverPct: [0, 100],
  precipitationMm: [0, 500],
  snowDepthCm: [0, 1_500],
  surfacePressureHpa: [500, 1_100],
  windSpeedMps: [0, 110],
  ghiWm2: [0, 1_500],
  dniWm2: [0, 1_600],
  dhiWm2: [0, 1_100],
};

