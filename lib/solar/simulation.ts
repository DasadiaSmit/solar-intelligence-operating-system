import type {
  ArrayConfig,
  GenerationHour,
  LocationConfig,
  LossChainItem,
  LossConfig,
  PlaneOfArrayIrradiance,
  SolarPosition,
  WeatherHour,
} from "../contracts/index";
import { transposeToPlaneOfArray } from "./irradiance";
import { calculateGenerationHour } from "./power";
import { calculateSolarPosition } from "./solar-position";

export interface SolarSimulationHour {
  weather: WeatherHour;
  position: SolarPosition;
  poa: PlaneOfArrayIrradiance;
  generation: GenerationHour;
}

export interface SolarSimulationResult {
  hourly: SolarSimulationHour[];
  annualAcKWh: number;
  annualDcKWh: number;
  annualIdealDcKWh: number;
  annualPoaKWhM2: number;
  peakAcKw: number;
  performanceRatio: number;
}

export function simulateSolarYear(
  weather: readonly WeatherHour[],
  location: LocationConfig,
  array: ArrayConfig,
  losses: LossConfig,
): SolarSimulationResult {
  const hourly = new Array<SolarSimulationHour>(weather.length);
  let annualAcKWh = 0;
  let annualDcKWh = 0;
  let annualIdealDcKWh = 0;
  let annualPoaKWhM2 = 0;
  let peakAcKw = 0;
  for (let index = 0; index < weather.length; index += 1) {
    const weatherHour = weather[index];
    if (!weatherHour) continue;
    // Geometry follows the actual UTC midpoint timestamp. `dayOfYear` remains
    // the no-leap modelling ordinal used to align time-series features; using
    // it as an astronomical override would shift every post-February hour in a
    // leap source year by one day.
    const position = calculateSolarPosition(weatherHour.timestamp, location);
    const poa = transposeToPlaneOfArray(weatherHour, position, array);
    const generation = calculateGenerationHour(weatherHour, poa, array, losses);
    annualAcKWh += generation.acKWh;
    annualDcKWh += generation.dcKWh;
    annualIdealDcKWh += generation.idealDcKWh;
    annualPoaKWhM2 += poa.effectiveWm2 / 1000;
    peakAcKw = Math.max(peakAcKw, generation.acKWh);
    hourly[index] = { weather: weatherHour, position, poa, generation };
  }
  return {
    hourly,
    annualAcKWh,
    annualDcKWh,
    annualIdealDcKWh,
    annualPoaKWhM2,
    peakAcKw,
    performanceRatio: annualIdealDcKWh > 0 ? annualAcKWh / annualIdealDcKWh : 0,
  };
}

type FactorKey =
  | "temperature"
  | "horizon"
  | "shading"
  | "soiling"
  | "dust"
  | "snow"
  | "mismatch"
  | "wiring"
  | "strings"
  | "availability"
  | "degradation"
  | "inverter";

const FACTOR_STAGES: Array<{ key: FactorKey; label: string; explanation: string }> = [
  { key: "temperature", label: "Module temperature", explanation: "Faiman thermal response and module power coefficient." },
  { key: "horizon", label: "Horizon obstruction", explanation: "Configured far-horizon obstruction approximation." },
  { key: "shading", label: "Near shading", explanation: "Configured shading, increased at grazing incidence." },
  { key: "soiling", label: "Soiling", explanation: "Surface contamination retained-energy factor." },
  { key: "dust", label: "Dust deposition", explanation: "Separate dry-deposition allowance." },
  { key: "snow", label: "Snow cover", explanation: "Configured and weather-dependent snow coverage." },
  { key: "mismatch", label: "Module mismatch", explanation: "Module-bin and operating-point mismatch." },
  { key: "wiring", label: "DC wiring", explanation: "Resistive DC collection losses." },
  { key: "strings", label: "String topology", explanation: "String-level imbalance and connection losses." },
  { key: "availability", label: "Availability", explanation: "Scheduled and unscheduled system unavailability." },
  { key: "degradation", label: "Ageing", explanation: "Compounded annual module degradation." },
  { key: "inverter", label: "DC to AC", explanation: "Part-load inverter conversion efficiency." },
];

export function buildLossChain(simulation: SolarSimulationResult): LossChainItem[] {
  let stageInput = simulation.annualIdealDcKWh;
  const chain: LossChainItem[] = [];
  for (const stage of FACTOR_STAGES) {
    let weightedOutput = 0;
    let weightedInput = 0;
    for (const hour of simulation.hourly) {
      const base = hour.generation.idealDcKWh;
      if (base <= 0) continue;
      weightedInput += base;
      weightedOutput += base * hour.generation.losses[stage.key];
    }
    const factor = weightedInput > 0 ? weightedOutput / weightedInput : 1;
    const stageOutput = stageInput * factor;
    chain.push({
      id: stage.key,
      label: stage.label,
      inputKWh: stageInput,
      outputKWh: stageOutput,
      lossKWh: Math.max(0, stageInput - stageOutput),
      lossPct: stageInput > 0 ? Math.max(0, (1 - stageOutput / stageInput) * 100) : 0,
      status: "implemented",
      explanation: stage.explanation,
    });
    stageInput = stageOutput;
  }
  const clippingKWh = simulation.hourly.reduce(
    (total, hour) => total + hour.generation.losses.clippingKWh,
    0,
  );
  chain.push({
    id: "clipping",
    label: "Inverter clipping",
    inputKWh: stageInput,
    outputKWh: Math.max(0, stageInput - clippingKWh),
    lossKWh: clippingKWh,
    lossPct: stageInput > 0 ? clippingKWh / stageInput * 100 : 0,
    status: "implemented",
    explanation: "Energy above the configured AC nameplate for the hourly interval.",
  });
  return chain;
}
