import type {
  BatteryConfig,
  CarbonConfig,
  EnergyFlowHour,
  TariffConfig,
  WeatherHour,
} from "../contracts/index";
import { clamp } from "../solar/math";

export interface EnergyDispatchSummary {
  flows: EnergyFlowHour[];
  demandKWh: number;
  solarToLoadKWh: number;
  batteryChargeKWh: number;
  batteryDischargeKWh: number;
  gridImportKWh: number;
  gridExportKWh: number;
  curtailedKWh: number;
  importCost: number;
  exportRevenue: number;
  carbonAvoidedKg: number;
  batteryCycles: number;
  finalSocKWh: number;
}

function isPeakHour(hour: number, tariff: TariffConfig): boolean {
  if (tariff.peakStartHour === tariff.peakEndHour) return false;
  if (tariff.peakStartHour < tariff.peakEndHour) {
    return hour >= tariff.peakStartHour && hour < tariff.peakEndHour;
  }
  return hour >= tariff.peakStartHour || hour < tariff.peakEndHour;
}

/**
 * Greedy self-consumption dispatch. batteryChargeKWh is AC energy entering the
 * charger and batteryDischargeKWh is AC energy delivered to demand. Conversion
 * losses appear in the state-of-charge balance, preserving energy conservation.
 */
export function dispatchEnergyYear(
  generationKWh: readonly number[],
  demandKWh: readonly number[],
  weather: readonly Pick<WeatherHour, "hour">[],
  battery: BatteryConfig,
  tariff: TariffConfig,
  carbon: CarbonConfig,
  forcedCurtailmentFraction = 0,
): EnergyDispatchSummary {
  const count = Math.min(generationKWh.length, demandKWh.length, weather.length);
  const capacity = battery.enabled ? Math.max(0, battery.capacityKWh) : 0;
  const minimumSoc = capacity * clamp(battery.minSocFraction, 0, 1);
  const reserveSoc = capacity * clamp(battery.reserveFraction, 0, 1);
  const maximumSoc = capacity * clamp(battery.maxSocFraction, 0, 1);
  let soc = clamp(battery.initialSocFraction, 0, 1) * capacity;
  soc = clamp(soc, minimumSoc, maximumSoc);
  const flows = new Array<EnergyFlowHour>(count);
  let totalDemand = 0;
  let totalSolarToLoad = 0;
  let totalCharge = 0;
  let totalDischarge = 0;
  let totalImport = 0;
  let totalExport = 0;
  let totalCurtailment = 0;
  let importCost = 0;
  let exportRevenue = 0;
  let carbonAvoidedKg = 0;
  let batteryThroughputKWh = 0;

  for (let index = 0; index < count; index += 1) {
    const generation = Math.max(0, generationKWh[index] ?? 0);
    const demand = Math.max(0, demandKWh[index] ?? 0);
    const hour = weather[index]?.hour ?? 0;
    if (capacity > 0) {
      soc = Math.max(minimumSoc, soc * (1 - clamp(battery.selfDischargePerHour, 0, 0.1)));
    }
    const solarToLoadKWh = Math.min(generation, demand);
    let surplus = generation - solarToLoadKWh;
    let deficit = demand - solarToLoadKWh;
    let batteryChargeKWh = 0;
    let batteryDischargeKWh = 0;

    if (capacity > 0 && surplus > 0 && soc < maximumSoc) {
      const chargeEfficiency = clamp(battery.chargeEfficiency, 0.01, 1);
      batteryChargeKWh = Math.min(
        surplus,
        Math.max(0, battery.maxChargeKw),
        (maximumSoc - soc) / chargeEfficiency,
      );
      soc += batteryChargeKWh * chargeEfficiency;
      surplus -= batteryChargeKWh;
      batteryThroughputKWh += batteryChargeKWh * chargeEfficiency;
    }
    if (capacity > 0 && deficit > 0) {
      const dischargeEfficiency = clamp(battery.dischargeEfficiency, 0.01, 1);
      const dispatchFloor = Math.max(minimumSoc, reserveSoc);
      const deliverable = Math.max(0, soc - dispatchFloor) * dischargeEfficiency;
      batteryDischargeKWh = Math.min(
        deficit,
        Math.max(0, battery.maxDischargeKw),
        deliverable,
      );
      soc -= batteryDischargeKWh / dischargeEfficiency;
      deficit -= batteryDischargeKWh;
      batteryThroughputKWh += batteryDischargeKWh / dischargeEfficiency;
    }

    const forcedCurtailment = surplus * clamp(forcedCurtailmentFraction, 0, 1);
    surplus -= forcedCurtailment;
    const gridExportKWh = Math.min(surplus, Math.max(0, tariff.gridExportLimitKw));
    const curtailedKWh = forcedCurtailment + Math.max(0, surplus - gridExportKWh);
    const gridImportKWh = deficit;
    const price = isPeakHour(hour, tariff)
      ? tariff.peakImportPricePerKWh
      : tariff.importPricePerKWh;
    const hourImportCost = gridImportKWh * price;
    const hourExportRevenue = gridExportKWh * tariff.exportPricePerKWh;
    const hourCarbonAvoidedKg =
      (solarToLoadKWh + batteryDischargeKWh) * carbon.gridIntensityKgCo2ePerKWh +
      gridExportKWh * carbon.gridIntensityKgCo2ePerKWh * carbon.exportDisplacementFactor;

    flows[index] = {
      demandKWh: demand,
      solarToLoadKWh,
      batteryChargeKWh,
      batteryDischargeKWh,
      batterySocKWh: soc,
      gridImportKWh,
      gridExportKWh,
      curtailedKWh,
      importCost: hourImportCost,
      exportRevenue: hourExportRevenue,
      carbonAvoidedKg: hourCarbonAvoidedKg,
    };
    totalDemand += demand;
    totalSolarToLoad += solarToLoadKWh;
    totalCharge += batteryChargeKWh;
    totalDischarge += batteryDischargeKWh;
    totalImport += gridImportKWh;
    totalExport += gridExportKWh;
    totalCurtailment += curtailedKWh;
    importCost += hourImportCost;
    exportRevenue += hourExportRevenue;
    carbonAvoidedKg += hourCarbonAvoidedKg;
  }

  return {
    flows,
    demandKWh: totalDemand,
    solarToLoadKWh: totalSolarToLoad,
    batteryChargeKWh: totalCharge,
    batteryDischargeKWh: totalDischarge,
    gridImportKWh: totalImport,
    gridExportKWh: totalExport,
    curtailedKWh: totalCurtailment,
    importCost: importCost + tariff.annualFixedCost,
    exportRevenue,
    carbonAvoidedKg,
    batteryCycles: capacity > 0 ? batteryThroughputKWh / (2 * capacity) : 0,
    finalSocKWh: soc,
  };
}

export function energyBalanceResidual(
  generationKWh: number,
  flow: EnergyFlowHour,
): number {
  return generationKWh -
    flow.solarToLoadKWh -
    flow.batteryChargeKWh -
    flow.gridExportKWh -
    flow.curtailedKWh;
}
