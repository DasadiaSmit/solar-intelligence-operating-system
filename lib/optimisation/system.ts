import type {
  OptimisationCandidate,
  OptimisationRecord,
  StressScenarioResult,
  SystemConfig,
  WeatherHour,
} from "../contracts/index";
import { buildDemandProfile, dispatchEnergyYear } from "../energy/index";
import { simulateSolarYear } from "../solar/simulation";
import { clamp } from "../solar/math";
import { paretoFront } from "./grid";
import { runYieldMonteCarlo } from "./monte-carlo";

interface EvaluatedCandidate extends OptimisationCandidate {
  localSupplyPct: number;
}

function unique(values: readonly number[]): number[] {
  return [...new Set(values.map((value) => Math.round(value * 1000) / 1000))];
}

function annualBaselineBill(demand: readonly number[], weather: readonly WeatherHour[], config: SystemConfig): number {
  let bill = config.tariff.annualFixedCost;
  for (let index = 0; index < demand.length; index += 1) {
    const hour = weather[index]?.hour ?? 0;
    const peak = config.tariff.peakStartHour < config.tariff.peakEndHour
      ? hour >= config.tariff.peakStartHour && hour < config.tariff.peakEndHour
      : hour >= config.tariff.peakStartHour || hour < config.tariff.peakEndHour;
    bill += (demand[index] ?? 0) * (peak
      ? config.tariff.peakImportPricePerKWh
      : config.tariff.importPricePerKWh);
  }
  return bill;
}

function evaluateCandidate(
  weather: readonly WeatherHour[],
  demand: readonly number[],
  baseConfig: SystemConfig,
  baselineBill: number,
  tiltDeg: number,
  azimuthDeg: number,
  dcAcRatio: number,
  batteryKWh: number,
): EvaluatedCandidate {
  const array = { ...baseConfig.array, tiltDeg, azimuthDeg, dcAcRatio };
  const battery = {
    ...baseConfig.battery,
    enabled: batteryKWh > 0,
    capacityKWh: batteryKWh,
    maxChargeKw: batteryKWh > 0 ? Math.min(baseConfig.battery.maxChargeKw, Math.max(2, batteryKWh / 2)) : 0,
    maxDischargeKw: batteryKWh > 0 ? Math.min(baseConfig.battery.maxDischargeKw, Math.max(2, batteryKWh / 2)) : 0,
  };
  const solar = simulateSolarYear(weather, baseConfig.location, array, baseConfig.losses);
  const dispatch = dispatchEnergyYear(
    solar.hourly.map((hour) => hour.generation.acKWh),
    demand,
    weather,
    battery,
    baseConfig.tariff,
    baseConfig.carbon,
    baseConfig.losses.curtailment,
  );
  const selfConsumed = Math.max(0, solar.annualAcKWh - dispatch.gridExportKWh - dispatch.curtailedKWh);
  return {
    id: `t${tiltDeg}-a${azimuthDeg}-r${dcAcRatio}-b${batteryKWh}`,
    tiltDeg,
    azimuthDeg,
    dcAcRatio,
    batteryKWh,
    annualGenerationKWh: solar.annualAcKWh,
    selfConsumptionPct: solar.annualAcKWh > 0 ? selfConsumed / solar.annualAcKWh * 100 : 0,
    revenue: baselineBill - dispatch.importCost + dispatch.exportRevenue,
    carbonAvoidedKg: dispatch.carbonAvoidedKg,
    curtailedKWh: dispatch.curtailedKWh,
    score: 0,
    paretoOptimal: false,
    localSupplyPct: dispatch.demandKWh > 0
      ? (dispatch.demandKWh - dispatch.gridImportKWh) / dispatch.demandKWh * 100
      : 100,
  };
}

function normalise(value: number, values: readonly number[]): number {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return maximum > minimum ? (value - minimum) / (maximum - minimum) : 0.5;
}

function transformedWeather(
  weather: readonly WeatherHour[],
  transform: (hour: WeatherHour) => WeatherHour,
): WeatherHour[] {
  return weather.map(transform);
}

function evaluateStressScenarios(
  weather: readonly WeatherHour[],
  demand: readonly number[],
  config: SystemConfig,
  baseline: EvaluatedCandidate,
  baselineBill: number,
): StressScenarioResult[] {
  const scenarios: Array<{
    id: string;
    label: string;
    explanation: string;
    weather: WeatherHour[];
    outage?: [number, number];
  }> = [
    {
      id: "summer-heatwave",
      label: "Extended summer heatwave",
      explanation: "June–August ambient temperature +6 °C and irradiance +2%; thermal derating is resolved hourly.",
      weather: transformedWeather(weather, (hour) => hour.month >= 6 && hour.month <= 8
        ? {
            ...hour,
            temperatureC: hour.temperatureC + 6,
            ghiWm2: hour.ghiWm2 * 1.02,
            dniWm2: hour.dniWm2 * 1.02,
            dhiWm2: hour.dhiWm2 * 1.02,
          }
        : hour),
    },
    {
      id: "atlantic-storm-week",
      label: "Atlantic storm week",
      explanation: "Seven autumn days receive 72% radiation attenuation and elevated wind.",
      weather: transformedWeather(weather, (hour) => hour.dayOfYear >= 280 && hour.dayOfYear < 287
        ? {
            ...hour,
            ghiWm2: hour.ghiWm2 * 0.28,
            dniWm2: hour.dniWm2 * 0.15,
            dhiWm2: hour.dhiWm2 * 0.52,
            windSpeedMps: Math.min(30, hour.windSpeedMps * 1.8),
            cloudCoverPct: Math.max(92, hour.cloudCoverPct),
          }
        : hour),
    },
    {
      id: "snow-cover",
      label: "Persistent snow cover",
      explanation: "Eight winter days impose at least 6 cm snow depth, activating the snow-loss model.",
      weather: transformedWeather(weather, (hour) => hour.dayOfYear >= 15 && hour.dayOfYear < 23
        ? { ...hour, snowDepthCm: Math.max(6, hour.snowDepthCm), temperatureC: Math.min(-1, hour.temperatureC) }
        : hour),
    },
    {
      id: "inverter-outage",
      label: "Seven-day inverter outage",
      explanation: "AC production is set to zero for seven July days after physical simulation.",
      weather: [...weather],
      outage: [190, 197],
    },
  ];

  return scenarios.map((scenario) => {
    const array = {
      ...config.array,
      tiltDeg: baseline.tiltDeg,
      azimuthDeg: baseline.azimuthDeg,
      dcAcRatio: baseline.dcAcRatio,
    };
    const solar = simulateSolarYear(scenario.weather, config.location, array, config.losses);
    let generation = solar.hourly.map((hour) => hour.generation.acKWh);
    if (scenario.outage) {
      const [start, end] = scenario.outage;
      generation = generation.map((value, index) => {
        const day = Math.floor(index / 24) + 1;
        return day >= start && day < end ? 0 : value;
      });
    }
    const dispatch = dispatchEnergyYear(
      generation,
      demand,
      scenario.weather,
      { ...config.battery, enabled: baseline.batteryKWh > 0, capacityKWh: baseline.batteryKWh },
      config.tariff,
      config.carbon,
      config.losses.curtailment,
    );
    const annualGeneration = generation.reduce((total, value) => total + value, 0);
    const revenue = baselineBill - dispatch.importCost + dispatch.exportRevenue;
    const localSupply = dispatch.demandKWh > 0
      ? (dispatch.demandKWh - dispatch.gridImportKWh) / dispatch.demandKWh * 100
      : 100;
    return {
      id: scenario.id,
      label: scenario.label,
      status: "simulated" as const,
      generationDeltaPct: baseline.annualGenerationKWh > 0
        ? (annualGeneration - baseline.annualGenerationKWh) / baseline.annualGenerationKWh * 100
        : 0,
      revenueDeltaPct: Math.abs(baseline.revenue) > Number.EPSILON
        ? (revenue - baseline.revenue) / Math.abs(baseline.revenue) * 100
        : 0,
      reliabilityDeltaPct: localSupply - baseline.localSupplyPct,
      explanation: scenario.explanation,
    };
  });
}

/** Full deterministic system grid search plus Pareto, uncertainty and stress products. */
export function optimiseSystem(
  weather: readonly WeatherHour[],
  config: SystemConfig,
): OptimisationRecord {
  const demand = buildDemandProfile(weather, config.demand);
  const baselineBill = annualBaselineBill(demand, weather, config);
  const tilts = unique([clamp(config.array.tiltDeg - 10, 0, 70), config.array.tiltDeg, clamp(config.array.tiltDeg + 10, 0, 70)]);
  const azimuths = unique([clamp(config.array.azimuthDeg - 18, 90, 270), config.array.azimuthDeg, clamp(config.array.azimuthDeg + 18, 90, 270)]);
  const ratios = unique([config.array.dcAcRatio, config.array.dcAcRatio <= 1.15 ? 1.3 : 1.1]);
  const batteries = unique([0, config.battery.capacityKWh, Math.max(config.battery.capacityKWh + 12, 36)]);
  const evaluated: EvaluatedCandidate[] = [];
  for (const tilt of tilts) {
    for (const azimuth of azimuths) {
      for (const ratio of ratios) {
        for (const battery of batteries) {
          evaluated.push(evaluateCandidate(
            weather,
            demand,
            config,
            baselineBill,
            tilt,
            azimuth,
            ratio,
            battery,
          ));
        }
      }
    }
  }
  const generations = evaluated.map((candidate) => candidate.annualGenerationKWh);
  const revenues = evaluated.map((candidate) => candidate.revenue);
  const carbon = evaluated.map((candidate) => candidate.carbonAvoidedKg);
  const scored = evaluated.map((candidate) => ({
    ...candidate,
    score:
      0.32 * normalise(candidate.annualGenerationKWh, generations) +
      0.23 * candidate.selfConsumptionPct / 100 +
      0.25 * normalise(candidate.revenue, revenues) +
      0.2 * normalise(candidate.carbonAvoidedKg, carbon) -
      candidate.batteryKWh * 0.0015,
  }));
  const frontIds = new Set(
    paretoFront(scored, [
      { value: (candidate) => candidate.annualGenerationKWh, direction: "maximize", tolerance: 0.1 },
      { value: (candidate) => candidate.selfConsumptionPct, direction: "maximize", tolerance: 0.01 },
      { value: (candidate) => candidate.revenue, direction: "maximize", tolerance: 0.01 },
      { value: (candidate) => candidate.carbonAvoidedKg, direction: "maximize", tolerance: 0.01 },
      { value: (candidate) => candidate.batteryKWh, direction: "minimize", tolerance: 0.01 },
    ]).map((candidate) => candidate.id),
  );
  const candidates: EvaluatedCandidate[] = scored
    .map((candidate) => ({ ...candidate, paretoOptimal: frontIds.has(candidate.id) }))
    .sort((a, b) => b.score - a.score);
  const baseline = evaluateCandidate(
    weather,
    demand,
    config,
    baselineBill,
    config.array.tiltDeg,
    config.array.azimuthDeg,
    config.array.dcAcRatio,
    config.battery.enabled ? config.battery.capacityKWh : 0,
  );
  baseline.paretoOptimal = frontIds.has(baseline.id);
  const recommended = candidates[0] ?? baseline;
  const toContract = ({ localSupplyPct, ...candidate }: EvaluatedCandidate): OptimisationCandidate => {
    void localSupplyPct;
    return candidate;
  };
  return {
    status: "experimental",
    method: "Deterministic grid search, five-objective Pareto dominance and seeded Monte Carlo",
    objective: "Balance generation, self-consumption, energy value and carbon while penalising storage capacity",
    evaluatedCandidates: candidates.length,
    baseline: toContract(baseline),
    recommended: toContract(recommended),
    paretoFront: candidates.filter((candidate) => candidate.paretoOptimal).map(toContract),
    terrain: candidates.map(toContract),
    monteCarlo: runYieldMonteCarlo({
      trials: 240,
      seed: config.seed ^ 0x51a2f00d,
      baselineGenerationKWh: baseline.annualGenerationKWh,
    }),
    stressScenarios: evaluateStressScenarios(weather, demand, config, baseline, baselineBill),
    plannedMethods: [
      "Bayesian optimisation (planned: no optimiser artifact bundled)",
      "Scenario-tree stochastic dispatch (planned)",
      "Distributionally robust optimisation (planned)",
    ],
  };
}
