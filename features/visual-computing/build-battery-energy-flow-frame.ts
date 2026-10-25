import type {
  EnergyFlowHour,
  HourlyOperatingPoint,
  OperatingSnapshot,
  ProvenanceRecord,
  WeatherHour,
} from "@/lib/contracts";
import {
  buildDemandProfile,
  dispatchEnergyYear,
} from "@/lib/energy";
import {
  BATTERY_ENERGY_FLOW_ANNUAL_RECORD_COUNT,
  BATTERY_ENERGY_FLOW_FRAME_SCHEMA_VERSION,
  BATTERY_ENERGY_FLOW_INTERVAL_SECONDS,
  BATTERY_ENERGY_FLOW_LINKED_DAY_RECORD_COUNT,
  batteryEnergyNumbersReconcile,
  deepFreezeBatteryEnergyFlowFrame,
  validBatteryEnergyFlowFrame,
  type BatteryEnergyFlowFrameBuildResult,
  type BatteryEnergyFlowFrameUnavailableReason,
  type BatteryEnergyFlowFrameV1,
  type BatteryEnergyFlowIntervalV1,
  type UnavailableBatteryEnergyFlowLayerV1,
} from "./battery-energy-flow-frame";
import type { SceneLifecycle } from "./scene-frame";

export interface BuildBatteryEnergyFlowFrameOptions {
  readonly snapshot: OperatingSnapshot;
  readonly resultId: string;
  readonly selectedIndex: number;
  readonly lifecycle: SceneLifecycle;
}

const VALID_LIFECYCLES = new Set<SceneLifecycle>([
  "IMPLEMENTED",
  "EXPERIMENTAL",
  "SIMULATED",
  "PLANNED",
]);
const FLOW_NUMERIC_KEYS = Object.freeze([
  "demandKWh",
  "solarToLoadKWh",
  "batteryChargeKWh",
  "batteryDischargeKWh",
  "batterySocKWh",
  "gridImportKWh",
  "gridExportKWh",
  "curtailedKWh",
  "importCost",
  "exportRevenue",
  "carbonAvoidedKg",
] as const satisfies readonly (keyof EnergyFlowHour)[]);

function failed(
  reason: BatteryEnergyFlowFrameUnavailableReason,
  summary: string,
): BatteryEnergyFlowFrameBuildResult {
  return Object.freeze({ status: "unavailable", reason, summary });
}

function unavailable(
  reason: string,
): UnavailableBatteryEnergyFlowLayerV1 {
  return Object.freeze({ status: "unavailable", reason, value: null });
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function within(
  value: number,
  minimum: number,
  maximum: number,
): boolean {
  return Number.isFinite(value)
    && value >= minimum
    && value <= maximum;
}

function validIsoTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed)
    && new Date(parsed).toISOString() === value;
}

function validConfiguration(
  snapshot: OperatingSnapshot,
): boolean {
  const { battery, tariff, demand, carbon, losses } = snapshot.config;
  return typeof battery.enabled === "boolean"
    && within(battery.capacityKWh, 0, Number.MAX_VALUE)
    && within(battery.maxChargeKw, 0, Number.MAX_VALUE)
    && within(battery.maxDischargeKw, 0, Number.MAX_VALUE)
    && within(battery.minSocFraction, 0, 1)
    && within(battery.maxSocFraction, 0, 1)
    && within(battery.initialSocFraction, 0, 1)
    && within(battery.reserveFraction, 0, 1)
    && battery.minSocFraction <= battery.maxSocFraction
    && battery.reserveFraction <= battery.maxSocFraction
    && within(battery.chargeEfficiency, 0.01, 1)
    && within(battery.dischargeEfficiency, 0.01, 1)
    && within(battery.selfDischargePerHour, 0, 0.1)
    && within(tariff.importPricePerKWh, 0, Number.MAX_VALUE)
    && within(tariff.peakImportPricePerKWh, 0, Number.MAX_VALUE)
    && within(tariff.exportPricePerKWh, 0, Number.MAX_VALUE)
    && within(tariff.annualFixedCost, 0, Number.MAX_VALUE)
    && within(tariff.gridExportLimitKw, 0, Number.MAX_VALUE)
    && nonEmpty(tariff.currency)
    && within(demand.annualDemandKWh, 0, Number.MAX_VALUE)
    && within(demand.weekendFraction, 0, 1)
    && within(carbon.gridIntensityKgCo2ePerKWh, 0, Number.MAX_VALUE)
    && within(carbon.exportDisplacementFactor, 0, 1)
    && within(losses.curtailment, 0, 1);
}

function canonicalWeather(
  hourly: readonly HourlyOperatingPoint[],
): WeatherHour[] | null {
  if (hourly.length !== BATTERY_ENERGY_FLOW_ANNUAL_RECORD_COUNT) {
    return null;
  }
  const first = hourly[0];
  const last = hourly.at(-1);
  if (
    !first
    || !last
    || !validIsoTimestamp(first.timestamp)
    || !validIsoTimestamp(last.timestamp)
  ) {
    return null;
  }
  const firstTime = Date.parse(first.timestamp);
  const firstDate = new Date(firstTime);
  const lastDate = new Date(last.timestamp);
  if (
    firstDate.getUTCMonth() !== 0
    || firstDate.getUTCDate() !== 1
    || firstDate.getUTCHours() !== 0
    || lastDate.getUTCFullYear() !== firstDate.getUTCFullYear()
    || lastDate.getUTCMonth() !== 11
    || lastDate.getUTCDate() !== 31
    || lastDate.getUTCHours() !== 23
  ) {
    return null;
  }

  const weather: WeatherHour[] = [];
  for (let index = 0; index < hourly.length; index += 1) {
    const point = hourly[index];
    if (!point) return null;
    const expectedTime =
      firstTime + index * BATTERY_ENERGY_FLOW_INTERVAL_SECONDS * 1_000;
    const timestamp = new Date(expectedTime);
    const numericWeatherValues = Object.values(point.weather).filter(
      (value): value is number => typeof value === "number",
    );
    const numericGenerationValues = Object.values(point.generation).flatMap(
      (value) =>
        typeof value === "number"
          ? [value]
          : value && typeof value === "object"
            ? Object.values(value).filter(
                (nested): nested is number =>
                  typeof nested === "number",
              )
            : [],
    );
    if (
      point.index !== index
      || !validIsoTimestamp(point.timestamp)
      || Date.parse(point.timestamp) !== expectedTime
      || point.month !== timestamp.getUTCMonth() + 1
      || point.day !== timestamp.getUTCDate()
      || point.hour !== timestamp.getUTCHours()
      || point.weather.timestamp !== point.timestamp
      || point.weather.month !== point.month
      || point.weather.day !== point.day
      || point.weather.hour !== point.hour
      || !validIsoTimestamp(point.weather.sourceTimestamp)
      || !numericWeatherValues.every(Number.isFinite)
      || !numericGenerationValues.every(Number.isFinite)
      || !within(point.generation.acKWh, 0, Number.MAX_VALUE)
      || !within(point.quality.score, 0, 1)
      || !within(point.quality.completeness, 0, 1)
      || typeof point.quality.imputed !== "boolean"
      || !point.quality.flags.every(nonEmpty)
      || !FLOW_NUMERIC_KEYS.every(
        (key) => Number.isFinite(point.flow[key]),
      )
    ) {
      return null;
    }
    weather.push({
      ...point.weather,
      quality: {
        ...point.quality,
        flags: [...point.quality.flags],
      },
    });
  }
  return weather;
}

function flowReconciles(
  stored: EnergyFlowHour,
  replayed: EnergyFlowHour,
): boolean {
  return FLOW_NUMERIC_KEYS.every((key) =>
    batteryEnergyNumbersReconcile(stored[key], replayed[key]));
}

function provenanceRecord(
  records: readonly ProvenanceRecord[],
  kind: ProvenanceRecord["kind"],
): ProvenanceRecord | null {
  return records.find((record) => record.kind === kind) ?? null;
}

function initialSoc(
  snapshot: OperatingSnapshot,
): number {
  const battery = snapshot.config.battery;
  const capacity = battery.enabled ? battery.capacityKWh : 0;
  const minimum = capacity * battery.minSocFraction;
  const maximum = capacity * battery.maxSocFraction;
  return Math.max(
    minimum,
    Math.min(maximum, capacity * battery.initialSocFraction),
  );
}

function intervalRecord(
  point: HourlyOperatingPoint,
  startSocKWh: number,
  snapshot: OperatingSnapshot,
): BatteryEnergyFlowIntervalV1 {
  const battery = snapshot.config.battery;
  const capacity = battery.enabled ? battery.capacityKWh : 0;
  const minimumSocKWh = capacity * battery.minSocFraction;
  const afterSelfDischargeKWh = capacity > 0
    ? Math.max(
        minimumSocKWh,
        startSocKWh * (1 - battery.selfDischargePerHour),
      )
    : 0;
  const expectedEndSocKWh =
    afterSelfDischargeKWh
    + point.flow.batteryChargeKWh * battery.chargeEfficiency
    - point.flow.batteryDischargeKWh
      / battery.dischargeEfficiency;
  const pvBalanceResidualKWh =
    point.generation.acKWh
    - point.flow.solarToLoadKWh
    - point.flow.batteryChargeKWh
    - point.flow.gridExportKWh
    - point.flow.curtailedKWh;
  const demandBalanceResidualKWh =
    point.flow.demandKWh
    - point.flow.solarToLoadKWh
    - point.flow.batteryDischargeKWh
    - point.flow.gridImportKWh;

  return {
    index: point.index,
    timestampUtc: point.timestamp,
    generationKWh: point.generation.acKWh,
    demandKWh: point.flow.demandKWh,
    solarToLoadKWh: point.flow.solarToLoadKWh,
    batteryChargeInputKWh: point.flow.batteryChargeKWh,
    batteryDischargeDeliveredKWh: point.flow.batteryDischargeKWh,
    batterySocStartKWh: startSocKWh,
    batterySocAfterSelfDischargeKWh: afterSelfDischargeKWh,
    batterySocEndKWh: point.flow.batterySocKWh,
    selfDischargeLossKWh: startSocKWh - afterSelfDischargeKWh,
    chargeConversionLossKWh:
      point.flow.batteryChargeKWh
      * (1 - battery.chargeEfficiency),
    dischargeConversionLossKWh:
      point.flow.batteryDischargeKWh
      / battery.dischargeEfficiency
      - point.flow.batteryDischargeKWh,
    gridImportKWh: point.flow.gridImportKWh,
    gridExportKWh: point.flow.gridExportKWh,
    curtailedKWh: point.flow.curtailedKWh,
    importCost: point.flow.importCost,
    exportRevenue: point.flow.exportRevenue,
    carbonAvoidedKg: point.flow.carbonAvoidedKg,
    pvBalanceResidualKWh,
    demandBalanceResidualKWh,
    socBalanceResidualKWh:
      point.flow.batterySocKWh - expectedEndSocKWh,
    inputQualityScore: point.quality.score,
  };
}

function evidence(
  resultId: string,
): readonly string[] {
  return Object.freeze([
    `evidence:${resultId}:hour.generation`,
    `evidence:${resultId}:hour.demand`,
    `evidence:${resultId}:hour.energy-routing`,
    `evidence:${resultId}:hour.battery-state`,
    `evidence:${resultId}:day.energy-routing`,
    `evidence:${resultId}:annual.energy-ledger`,
    `evidence:${resultId}:config.battery`,
  ]);
}

export function buildBatteryEnergyFlowFrameV1({
  snapshot,
  resultId,
  selectedIndex,
  lifecycle,
}: BuildBatteryEnergyFlowFrameOptions):
BatteryEnergyFlowFrameBuildResult {
  if (!nonEmpty(resultId)) {
    return failed(
      "invalid-result-id",
      "Battery energy flow requires a non-empty canonical result identity.",
    );
  }
  if (!VALID_LIFECYCLES.has(lifecycle)) {
    return failed(
      "invalid-lifecycle",
      "Battery energy-flow lifecycle is outside the Observatory contract.",
    );
  }
  if (
    !Number.isInteger(selectedIndex)
    || selectedIndex < 0
    || selectedIndex >= BATTERY_ENERGY_FLOW_ANNUAL_RECORD_COUNT
  ) {
    return failed(
      "invalid-linked-index",
      "Battery energy flow requires one valid linked annual record index.",
    );
  }
  if (!validConfiguration(snapshot)) {
    return failed(
      "invalid-battery-configuration",
      "Battery, tariff, demand, carbon, or curtailment inputs are outside the canonical dispatch contract.",
    );
  }

  const weather = canonicalWeather(snapshot.hourly);
  if (!weather) {
    return failed(
      "invalid-chronology",
      "Battery energy flow requires one contiguous 8,760-record UTC chronology with valid generation, flow, and quality values.",
    );
  }

  let replay;
  try {
    const demand = buildDemandProfile(weather, snapshot.config.demand);
    replay = dispatchEnergyYear(
      snapshot.hourly.map((point) => point.generation.acKWh),
      demand,
      weather,
      snapshot.config.battery,
      snapshot.config.tariff,
      snapshot.config.carbon,
      snapshot.config.losses.curtailment,
    );
  } catch {
    return failed(
      "canonical-dispatch-replay-failed",
      "The canonical demand and battery dispatch calculation could not be replayed.",
    );
  }

  if (
    replay.flows.length !== snapshot.hourly.length
    || snapshot.hourly.some((point, index) => {
      const replayed = replay.flows[index];
      return !replayed || !flowReconciles(point.flow, replayed);
    })
  ) {
    return failed(
      "stored-dispatch-reconciliation-failed",
      "Stored hourly routing does not reconcile with the canonical greedy self-consumption dispatch.",
    );
  }

  const generationKWh = snapshot.hourly.reduce(
    (total, point) => total + point.generation.acKWh,
    0,
  );
  const inputQualityScore = snapshot.hourly.reduce(
    (total, point) => total + point.quality.score,
    0,
  ) / snapshot.hourly.length;
  const generationRetainedOnSiteKWh =
    generationKWh - replay.gridExportKWh - replay.curtailedKWh;
  const localSupplyToLoadKWh =
    replay.solarToLoadKWh + replay.batteryDischargeKWh;
  const summary = snapshot.summary;
  const expectedSelfConsumptionPct = generationKWh > 0
    ? generationRetainedOnSiteKWh / generationKWh * 100
    : 0;
  const expectedSolarFractionPct = replay.demandKWh > 0
    ? localSupplyToLoadKWh / replay.demandKWh * 100
    : 0;
  const expectedReliabilityPct = replay.demandKWh > 0
    ? (replay.demandKWh - replay.gridImportKWh)
      / replay.demandKWh * 100
    : 100;
  if (
    !batteryEnergyNumbersReconcile(
      summary.annualGenerationKWh,
      generationKWh,
    )
    || !batteryEnergyNumbersReconcile(
      summary.annualDemandKWh,
      replay.demandKWh,
    )
    || !batteryEnergyNumbersReconcile(
      summary.selfConsumedKWh,
      generationRetainedOnSiteKWh,
    )
    || !batteryEnergyNumbersReconcile(
      summary.selfConsumptionPct,
      expectedSelfConsumptionPct,
    )
    || !batteryEnergyNumbersReconcile(
      summary.solarFractionPct,
      expectedSolarFractionPct,
    )
    || !batteryEnergyNumbersReconcile(
      summary.reliabilityPct,
      expectedReliabilityPct,
    )
    || !batteryEnergyNumbersReconcile(
      summary.gridImportKWh,
      replay.gridImportKWh,
    )
    || !batteryEnergyNumbersReconcile(
      summary.gridExportKWh,
      replay.gridExportKWh,
    )
    || !batteryEnergyNumbersReconcile(
      summary.curtailedKWh,
      replay.curtailedKWh,
    )
    || !batteryEnergyNumbersReconcile(
      summary.batteryCycles,
      replay.batteryCycles,
    )
    || !batteryEnergyNumbersReconcile(
      summary.importCost,
      replay.importCost,
    )
    || !batteryEnergyNumbersReconcile(
      summary.exportRevenue,
      replay.exportRevenue,
    )
    || !batteryEnergyNumbersReconcile(
      summary.carbonAvoidedKg,
      replay.carbonAvoidedKg,
    )
    || !batteryEnergyNumbersReconcile(
      summary.qualityScore,
      inputQualityScore,
    )
  ) {
    return failed(
      "annual-summary-reconciliation-failed",
      "The annual battery, grid, tariff, carbon, or quality summary does not reconcile with canonical hourly dispatch.",
    );
  }

  const linkedPoint = snapshot.hourly[selectedIndex];
  if (!linkedPoint) {
    return failed(
      "invalid-linked-index",
      "The linked battery dispatch record is absent.",
    );
  }
  const linkedDate = linkedPoint.timestamp.slice(0, 10);
  const linkedDayPoints = snapshot.hourly.filter(
    (point) => point.timestamp.slice(0, 10) === linkedDate,
  );
  if (
    linkedDayPoints.length
      !== BATTERY_ENERGY_FLOW_LINKED_DAY_RECORD_COUNT
    || !linkedDayPoints.some((point) => point.index === selectedIndex)
  ) {
    return failed(
      "invalid-chronology",
      "The linked UTC day does not contain exactly 24 contiguous canonical records.",
    );
  }
  const linkedDayStartIndex = linkedDayPoints[0]?.index;
  if (linkedDayStartIndex === undefined) {
    return failed(
      "invalid-chronology",
      "The linked UTC day has no starting record.",
    );
  }
  const dayIntervals = linkedDayPoints.map((point) => {
    const previous = snapshot.hourly[point.index - 1];
    return intervalRecord(
      point,
      previous?.flow.batterySocKWh ?? initialSoc(snapshot),
      snapshot,
    );
  });
  const linkedInterval =
    dayIntervals[selectedIndex - linkedDayStartIndex];
  if (!linkedInterval) {
    return failed(
      "invalid-linked-index",
      "The linked record could not be resolved inside its UTC day.",
    );
  }

  const provider = provenanceRecord(snapshot.provenance, "provider");
  const dataset = provenanceRecord(snapshot.provenance, "dataset");
  const calculation = provenanceRecord(snapshot.provenance, "calculation");
  const scenario = provenanceRecord(snapshot.provenance, "scenario");
  if (
    !provider
    || !dataset
    || !calculation
    || !scenario
    || !nonEmpty(provider.provider)
    || !nonEmpty(dataset.version)
    || !nonEmpty(calculation.calculationVersion)
    || !nonEmpty(scenario.version)
  ) {
    return failed(
      "missing-provenance",
      "Battery energy flow requires provider, dataset, calculation, and scenario provenance.",
    );
  }

  const activeCapacity = snapshot.config.battery.enabled
    ? snapshot.config.battery.capacityKWh
    : 0;
  const battery = snapshot.config.battery;
  const pvBalanceResidualKWh =
    generationKWh
    - replay.solarToLoadKWh
    - replay.batteryChargeKWh
    - replay.gridExportKWh
    - replay.curtailedKWh;
  const demandBalanceResidualKWh =
    replay.demandKWh
    - replay.solarToLoadKWh
    - replay.batteryDischargeKWh
    - replay.gridImportKWh;
  const frame: BatteryEnergyFlowFrameV1 = {
    schemaVersion: BATTERY_ENERGY_FLOW_FRAME_SCHEMA_VERSION,
    resultId,
    lifecycle,
    chronology: {
      recordCount: BATTERY_ENERGY_FLOW_ANNUAL_RECORD_COUNT,
      intervalSeconds: BATTERY_ENERGY_FLOW_INTERVAL_SECONDS,
      calendar: "contiguous-no-leap-utc-year",
      linkedIndex: selectedIndex,
      linkedTimestampUtc: linkedPoint.timestamp,
      timestampRole: "canonical-record-anchor",
      intervalBoundaryAttribution: "unavailable",
      linkedDayStartIndex,
      linkedDayRecordCount:
        BATTERY_ENERGY_FLOW_LINKED_DAY_RECORD_COUNT,
    },
    dispatchBoundary: {
      strategy: "greedy-self-consumption",
      deterministic: true,
      acSideEnergyAccounting: true,
      oneHourEnergyAccounting: true,
      measuredTelemetry: false,
      liveControl: false,
      gridCharging: false,
      batteryExportToGrid: false,
      autonomousController: false,
      tariffOptimized: false,
      forecastAware: false,
      islandingModel: false,
      issuedSchedule: false,
      bankableAssessment: false,
    },
    battery: {
      enabled: battery.enabled,
      capacityKWh: battery.capacityKWh,
      maxChargeKW: battery.maxChargeKw,
      maxDischargeKW: battery.maxDischargeKw,
      minSocFraction: battery.minSocFraction,
      maxSocFraction: battery.maxSocFraction,
      initialSocFraction: battery.initialSocFraction,
      reserveFraction: battery.reserveFraction,
      chargeEfficiency: battery.chargeEfficiency,
      dischargeEfficiency: battery.dischargeEfficiency,
      selfDischargePerHour: battery.selfDischargePerHour,
      minimumSocKWh: activeCapacity * battery.minSocFraction,
      maximumSocKWh: activeCapacity * battery.maxSocFraction,
      initialSocKWh: initialSoc(snapshot),
      reserveSocKWh: activeCapacity * battery.reserveFraction,
      gridExportLimitKW: snapshot.config.tariff.gridExportLimitKw,
    },
    linkedInterval,
    linkedUtcDay: dayIntervals,
    annual: {
      generationKWh,
      demandKWh: replay.demandKWh,
      solarToLoadKWh: replay.solarToLoadKWh,
      batteryChargeInputKWh: replay.batteryChargeKWh,
      batteryDischargeDeliveredKWh: replay.batteryDischargeKWh,
      gridImportKWh: replay.gridImportKWh,
      gridExportKWh: replay.gridExportKWh,
      curtailedKWh: replay.curtailedKWh,
      generationRetainedOnSiteKWh,
      localSupplyToLoadKWh,
      importCost: replay.importCost,
      exportRevenue: replay.exportRevenue,
      carbonAvoidedKg: replay.carbonAvoidedKg,
      equivalentFullCycleThroughputProxy: replay.batteryCycles,
      finalSocKWh: replay.finalSocKWh,
      inputQualityScore,
      pvBalanceResidualKWh,
      demandBalanceResidualKWh,
    },
    units: {
      intervalEnergy: "kWh per 3,600-second record",
      annualEnergy: "kWh per modeled year",
      batteryState: "kWh",
      configuredPowerLimit:
        "kW; applied as a one-hour energy cap by the hourly dispatch",
      currency: snapshot.config.tariff.currency,
      carbon: "kgCO2e",
      quality: "unitless 0–1 input/weather quality score",
    },
    visualEncoding: {
      kind: "normalized-logical-energy-allocation-schematic",
      magnitudeBasis: "linked-utc-day-accumulated-energy",
      oneGridIntertie: true,
      boundedBatteryReservoir: true,
      directionEncoding: true,
      physicalTopology: false,
      livePowerFlow: false,
      animatedParticles: false,
      exactValuesRemainHtml: true,
    },
    provenance: {
      provider: provider.provider,
      datasetVersion: dataset.version,
      calculationVersion: calculation.calculationVersion,
      scenarioVersion: scenario.version,
      evidenceRefIds: evidence(resultId),
    },
    unavailableLayers: {
      instantaneousPowerAndIntraHourDirection: unavailable(
        "Only 3,600-second interval energy is available; instantaneous power, ramps, transients, and within-record direction are not measured or modeled.",
      ),
      physicalWiringAndMeterTopology: unavailable(
        "No surveyed cable, inverter, meter, switchgear, or single-line topology is attached.",
      ),
      measuredPlantOrInverterTelemetry: unavailable(
        "No measured plant, inverter, battery, load, or grid telemetry is connected.",
      ),
      bmsVoltageCurrentTemperatureAndAlarms: unavailable(
        "No cell- or pack-level voltage, current, temperature, alarm, or BMS record is available.",
      ),
      stateOfHealthDegradationWarrantyAndLifetime: unavailable(
        "The dispatch result does not calculate battery state of health, electrochemical degradation, warranty use, or remaining lifetime.",
      ),
      protectionCellBalancingAndControllerDynamics: unavailable(
        "Protection trips, cell balancing, converter dynamics, and sub-hour controller behavior are outside the hourly energy ledger.",
      ),
      dynamicTariffCarbonMarketAndGridEvents: unavailable(
        "No time-resolved tariff, carbon-intensity, congestion, market-settlement, or grid-event series is attached.",
      ),
      dispatchUncertainty: unavailable(
        "No calibrated uncertainty distribution or measured validation record exists for the dispatch trajectory.",
      ),
      alternativeOptimizationTrajectories: unavailable(
        "Forecast-aware, tariff-optimal, MPC, autonomous, and alternative dispatch schedules were not calculated.",
      ),
      outageIslandingBackupAndBlackStart: unavailable(
        "Outage, islanding, backup autonomy, black-start, and reliability behavior are not modeled.",
      ),
      attributableIntervalStartAndEnd: unavailable(
        "The canonical timestamp is a record anchor; source evidence does not assign it as the interval start or end.",
      ),
    },
  };

  if (!validBatteryEnergyFlowFrame(frame)) {
    return failed(
      "stored-dispatch-reconciliation-failed",
      "The canonical battery frame failed its conservation, state, chronology, or provenance contract.",
    );
  }
  return Object.freeze({
    status: "ready",
    frame: deepFreezeBatteryEnergyFlowFrame(frame),
  });
}
