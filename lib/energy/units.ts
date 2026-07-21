export function wattsToKilowatts(watts: number): number {
  return watts / 1000;
}

export function wattHoursToKilowattHours(wattHours: number): number {
  return wattHours / 1000;
}

export function joulesToKilowattHours(joules: number): number {
  return joules / 3_600_000;
}

export function celsiusToKelvin(celsius: number): number {
  return celsius + 273.15;
}

export function kelvinToCelsius(kelvin: number): number {
  return kelvin - 273.15;
}

export function millimetresToMetres(millimetres: number): number {
  return millimetres / 1000;
}

export function clampFraction(value: number): number {
  return Math.max(0, Math.min(1, value));
}
