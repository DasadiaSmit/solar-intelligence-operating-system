import type {
  ArrayConfig,
  GenerationHour,
  LossConfig,
  PlaneOfArrayIrradiance,
  WeatherHour,
} from "../contracts/index";
import { clamp } from "./math";

/**
 * Faiman module-temperature model: Tm = Ta + E / (u0 + u1*v).
 * Defaults (25, 6.84) are generic open-rack coefficients, not module-specific.
 */
export function faimanCellTemperatureC(
  ambientTemperatureC: number,
  planeOfArrayWm2: number,
  windSpeedMps: number,
  u0 = 25,
  u1 = 6.84,
): number {
  const heatLoss = Math.max(1, u0 + u1 * Math.max(0, windSpeedMps));
  return ambientTemperatureC + Math.max(0, planeOfArrayWm2) / heatLoss;
}

function retained(loss: number): number {
  return 1 - clamp(loss, 0, 0.99);
}

export function calculateGenerationHour(
  weather: Pick<WeatherHour, "temperatureC" | "windSpeedMps" | "snowDepthCm">,
  poa: PlaneOfArrayIrradiance,
  array: ArrayConfig,
  losses: LossConfig,
): GenerationHour {
  const cellTemperatureC = faimanCellTemperatureC(
    weather.temperatureC,
    poa.effectiveWm2,
    weather.windSpeedMps,
  );
  const idealDcKWh = array.capacityKwDc * Math.max(0, poa.effectiveWm2) / 1000;
  const temperature = clamp(
    1 + array.temperatureCoefficientPerC * (cellTemperatureC - 25),
    0.65,
    1.08,
  );
  const lowSunMultiplier = poa.angleOfIncidenceDeg > 75 ? 1.35 : 1;
  const horizon = retained(losses.horizon);
  const shading = retained(losses.shading * lowSunMultiplier);
  const soiling = retained(losses.soiling);
  const dust = retained(losses.dust);
  const snowDynamic = weather.snowDepthCm > 0 ? Math.min(0.95, weather.snowDepthCm / 7) : 0;
  const snow = retained(Math.max(losses.snow, snowDynamic));
  const mismatch = retained(losses.mismatch);
  const wiring = retained(losses.wiring);
  const strings = retained(losses.strings);
  const availability = retained(losses.availability);
  const degradation = clamp(
    (1 - clamp(array.degradationPerYear, 0, 0.1)) ** Math.max(0, array.systemAgeYears),
    0,
    1,
  );
  const dcKWh =
    idealDcKWh *
    temperature *
    horizon *
    shading *
    soiling *
    dust *
    snow *
    mismatch *
    wiring *
    strings *
    availability *
    degradation;
  const acCapacityKw = array.capacityKwDc / Math.max(1, array.dcAcRatio);
  const dcLoadFraction = acCapacityKw > 0 ? dcKWh / acCapacityKw : 0;
  const partLoadAdjustment = dcKWh <= 0 ? 0 : 0.92 + 0.08 * Math.sqrt(clamp(dcLoadFraction, 0, 1));
  const inverter = clamp(array.inverterEfficiency * partLoadAdjustment, 0, 1);
  const preClippingAcKWh = dcKWh * inverter;
  const acKWh = Math.min(acCapacityKw, preClippingAcKWh);
  const clippingKWh = Math.max(0, preClippingAcKWh - acKWh);
  return {
    cellTemperatureC,
    idealDcKWh,
    dcKWh,
    acKWh,
    acCapacityKw,
    performanceRatio: idealDcKWh > 0 ? acKWh / idealDcKWh : 0,
    losses: {
      temperature,
      horizon,
      shading,
      soiling,
      dust,
      snow,
      mismatch,
      wiring,
      strings,
      availability,
      degradation,
      inverter,
      clippingKWh,
    },
  };
}
