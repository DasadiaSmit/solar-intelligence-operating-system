import type { SceneLifecycle } from "./scene-frame";

export const BATTERY_ENERGY_FLOW_FRAME_SCHEMA_VERSION = "1.0.0";
export const BATTERY_ENERGY_FLOW_ANNUAL_RECORD_COUNT = 8_760;
export const BATTERY_ENERGY_FLOW_INTERVAL_SECONDS = 3_600;
export const BATTERY_ENERGY_FLOW_LINKED_DAY_RECORD_COUNT = 24;

export interface UnavailableBatteryEnergyFlowLayerV1 {
  readonly status: "unavailable";
  readonly reason: string;
  readonly value: null;
}

export interface BatteryEnergyFlowIntervalV1 {
  readonly index: number;
  readonly timestampUtc: string;
  readonly generationKWh: number;
  readonly demandKWh: number;
  readonly solarToLoadKWh: number;
  readonly batteryChargeInputKWh: number;
  readonly batteryDischargeDeliveredKWh: number;
  readonly batterySocStartKWh: number;
  readonly batterySocAfterSelfDischargeKWh: number;
  readonly batterySocEndKWh: number;
  readonly selfDischargeLossKWh: number;
  readonly chargeConversionLossKWh: number;
  readonly dischargeConversionLossKWh: number;
  readonly gridImportKWh: number;
  readonly gridExportKWh: number;
  readonly curtailedKWh: number;
  readonly importCost: number;
  readonly exportRevenue: number;
  readonly carbonAvoidedKg: number;
  readonly pvBalanceResidualKWh: number;
  readonly demandBalanceResidualKWh: number;
  readonly socBalanceResidualKWh: number;
  readonly inputQualityScore: number;
}

export interface BatteryEnergyFlowFrameV1 {
  readonly schemaVersion:
    typeof BATTERY_ENERGY_FLOW_FRAME_SCHEMA_VERSION;
  readonly resultId: string;
  readonly lifecycle: SceneLifecycle;
  readonly chronology: {
    readonly recordCount:
      typeof BATTERY_ENERGY_FLOW_ANNUAL_RECORD_COUNT;
    readonly intervalSeconds:
      typeof BATTERY_ENERGY_FLOW_INTERVAL_SECONDS;
    readonly calendar: "contiguous-no-leap-utc-year";
    readonly linkedIndex: number;
    readonly linkedTimestampUtc: string;
    readonly timestampRole: "canonical-record-anchor";
    readonly intervalBoundaryAttribution: "unavailable";
    readonly linkedDayStartIndex: number;
    readonly linkedDayRecordCount:
      typeof BATTERY_ENERGY_FLOW_LINKED_DAY_RECORD_COUNT;
  };
  readonly dispatchBoundary: {
    readonly strategy: "greedy-self-consumption";
    readonly deterministic: true;
    readonly acSideEnergyAccounting: true;
    readonly oneHourEnergyAccounting: true;
    readonly measuredTelemetry: false;
    readonly liveControl: false;
    readonly gridCharging: false;
    readonly batteryExportToGrid: false;
    readonly autonomousController: false;
    readonly tariffOptimized: false;
    readonly forecastAware: false;
    readonly islandingModel: false;
    readonly issuedSchedule: false;
    readonly bankableAssessment: false;
  };
  readonly battery: {
    readonly enabled: boolean;
    readonly capacityKWh: number;
    readonly maxChargeKW: number;
    readonly maxDischargeKW: number;
    readonly minSocFraction: number;
    readonly maxSocFraction: number;
    readonly initialSocFraction: number;
    readonly reserveFraction: number;
    readonly chargeEfficiency: number;
    readonly dischargeEfficiency: number;
    readonly selfDischargePerHour: number;
    readonly minimumSocKWh: number;
    readonly maximumSocKWh: number;
    readonly initialSocKWh: number;
    readonly reserveSocKWh: number;
    readonly gridExportLimitKW: number;
  };
  readonly linkedInterval: BatteryEnergyFlowIntervalV1;
  readonly linkedUtcDay: readonly BatteryEnergyFlowIntervalV1[];
  readonly annual: {
    readonly generationKWh: number;
    readonly demandKWh: number;
    readonly solarToLoadKWh: number;
    readonly batteryChargeInputKWh: number;
    readonly batteryDischargeDeliveredKWh: number;
    readonly gridImportKWh: number;
    readonly gridExportKWh: number;
    readonly curtailedKWh: number;
    readonly generationRetainedOnSiteKWh: number;
    readonly localSupplyToLoadKWh: number;
    readonly importCost: number;
    readonly exportRevenue: number;
    readonly carbonAvoidedKg: number;
    readonly equivalentFullCycleThroughputProxy: number;
    readonly finalSocKWh: number;
    readonly inputQualityScore: number;
    readonly pvBalanceResidualKWh: number;
    readonly demandBalanceResidualKWh: number;
  };
  readonly units: {
    readonly intervalEnergy: "kWh per 3,600-second record";
    readonly annualEnergy: "kWh per modeled year";
    readonly batteryState: "kWh";
    readonly configuredPowerLimit:
      "kW; applied as a one-hour energy cap by the hourly dispatch";
    readonly currency: string;
    readonly carbon: "kgCO2e";
    readonly quality: "unitless 0–1 input/weather quality score";
  };
  readonly visualEncoding: {
    readonly kind: "normalized-logical-energy-allocation-schematic";
    readonly magnitudeBasis: "linked-utc-day-accumulated-energy";
    readonly oneGridIntertie: true;
    readonly boundedBatteryReservoir: true;
    readonly directionEncoding: true;
    readonly physicalTopology: false;
    readonly livePowerFlow: false;
    readonly animatedParticles: false;
    readonly exactValuesRemainHtml: true;
  };
  readonly provenance: {
    readonly provider: string;
    readonly datasetVersion: string;
    readonly calculationVersion: string;
    readonly scenarioVersion: string;
    readonly evidenceRefIds: readonly string[];
  };
  readonly unavailableLayers: {
    readonly instantaneousPowerAndIntraHourDirection:
      UnavailableBatteryEnergyFlowLayerV1;
    readonly physicalWiringAndMeterTopology:
      UnavailableBatteryEnergyFlowLayerV1;
    readonly measuredPlantOrInverterTelemetry:
      UnavailableBatteryEnergyFlowLayerV1;
    readonly bmsVoltageCurrentTemperatureAndAlarms:
      UnavailableBatteryEnergyFlowLayerV1;
    readonly stateOfHealthDegradationWarrantyAndLifetime:
      UnavailableBatteryEnergyFlowLayerV1;
    readonly protectionCellBalancingAndControllerDynamics:
      UnavailableBatteryEnergyFlowLayerV1;
    readonly dynamicTariffCarbonMarketAndGridEvents:
      UnavailableBatteryEnergyFlowLayerV1;
    readonly dispatchUncertainty:
      UnavailableBatteryEnergyFlowLayerV1;
    readonly alternativeOptimizationTrajectories:
      UnavailableBatteryEnergyFlowLayerV1;
    readonly outageIslandingBackupAndBlackStart:
      UnavailableBatteryEnergyFlowLayerV1;
    readonly attributableIntervalStartAndEnd:
      UnavailableBatteryEnergyFlowLayerV1;
  };
}

export const BATTERY_ENERGY_FLOW_UNAVAILABLE_LAYER_KEYS = Object.freeze([
  "instantaneousPowerAndIntraHourDirection",
  "physicalWiringAndMeterTopology",
  "measuredPlantOrInverterTelemetry",
  "bmsVoltageCurrentTemperatureAndAlarms",
  "stateOfHealthDegradationWarrantyAndLifetime",
  "protectionCellBalancingAndControllerDynamics",
  "dynamicTariffCarbonMarketAndGridEvents",
  "dispatchUncertainty",
  "alternativeOptimizationTrajectories",
  "outageIslandingBackupAndBlackStart",
  "attributableIntervalStartAndEnd",
] as const satisfies readonly (
  keyof BatteryEnergyFlowFrameV1["unavailableLayers"]
)[]);

export type BatteryEnergyFlowFrameUnavailableReason =
  | "invalid-result-id"
  | "invalid-lifecycle"
  | "invalid-linked-index"
  | "invalid-chronology"
  | "invalid-battery-configuration"
  | "canonical-dispatch-replay-failed"
  | "stored-dispatch-reconciliation-failed"
  | "annual-summary-reconciliation-failed"
  | "missing-provenance";

export type BatteryEnergyFlowFrameBuildResult =
  | {
      readonly status: "ready";
      readonly frame: BatteryEnergyFlowFrameV1;
    }
  | {
      readonly status: "unavailable";
      readonly reason: BatteryEnergyFlowFrameUnavailableReason;
      readonly summary: string;
    };

const VALID_LIFECYCLES = new Set<SceneLifecycle>([
  "IMPLEMENTED",
  "EXPERIMENTAL",
  "SIMULATED",
  "PLANNED",
]);

const INTERVAL_NUMERIC_KEYS = Object.freeze([
  "generationKWh",
  "demandKWh",
  "solarToLoadKWh",
  "batteryChargeInputKWh",
  "batteryDischargeDeliveredKWh",
  "batterySocStartKWh",
  "batterySocAfterSelfDischargeKWh",
  "batterySocEndKWh",
  "selfDischargeLossKWh",
  "chargeConversionLossKWh",
  "dischargeConversionLossKWh",
  "gridImportKWh",
  "gridExportKWh",
  "curtailedKWh",
  "importCost",
  "exportRevenue",
  "carbonAvoidedKg",
  "pvBalanceResidualKWh",
  "demandBalanceResidualKWh",
  "socBalanceResidualKWh",
  "inputQualityScore",
] as const satisfies readonly (
  keyof BatteryEnergyFlowIntervalV1
)[]);

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

export function batteryEnergyNumbersReconcile(
  first: number,
  second: number,
): boolean {
  const tolerance = Math.max(
    1e-8,
    Math.max(Math.abs(first), Math.abs(second)) * 1e-10,
  );
  return Number.isFinite(first)
    && Number.isFinite(second)
    && Math.abs(first - second) <= tolerance;
}

function validUnavailableLayer(
  layer: UnavailableBatteryEnergyFlowLayerV1,
): boolean {
  return layer.status === "unavailable"
    && layer.value === null
    && nonEmpty(layer.reason);
}

function validBattery(
  battery: BatteryEnergyFlowFrameV1["battery"],
): boolean {
  const activeCapacity = battery.enabled ? battery.capacityKWh : 0;
  const expectedMinimum = activeCapacity * battery.minSocFraction;
  const expectedMaximum = activeCapacity * battery.maxSocFraction;
  const expectedReserve = activeCapacity * battery.reserveFraction;
  const expectedInitial = Math.max(
    expectedMinimum,
    Math.min(
      expectedMaximum,
      activeCapacity * battery.initialSocFraction,
    ),
  );
  return typeof battery.enabled === "boolean"
    && within(battery.capacityKWh, 0, Number.MAX_VALUE)
    && within(battery.maxChargeKW, 0, Number.MAX_VALUE)
    && within(battery.maxDischargeKW, 0, Number.MAX_VALUE)
    && within(battery.gridExportLimitKW, 0, Number.MAX_VALUE)
    && within(battery.minSocFraction, 0, 1)
    && within(battery.maxSocFraction, 0, 1)
    && within(battery.initialSocFraction, 0, 1)
    && within(battery.reserveFraction, 0, 1)
    && battery.minSocFraction <= battery.maxSocFraction
    && battery.reserveFraction <= battery.maxSocFraction
    && within(battery.chargeEfficiency, 0.01, 1)
    && within(battery.dischargeEfficiency, 0.01, 1)
    && within(battery.selfDischargePerHour, 0, 0.1)
    && batteryEnergyNumbersReconcile(
      battery.minimumSocKWh,
      expectedMinimum,
    )
    && batteryEnergyNumbersReconcile(
      battery.maximumSocKWh,
      expectedMaximum,
    )
    && batteryEnergyNumbersReconcile(
      battery.reserveSocKWh,
      expectedReserve,
    )
    && batteryEnergyNumbersReconcile(
      battery.initialSocKWh,
      expectedInitial,
    );
}

function validInterval(
  interval: BatteryEnergyFlowIntervalV1,
  battery: BatteryEnergyFlowFrameV1["battery"],
): boolean {
  if (
    !Number.isInteger(interval.index)
    || interval.index < 0
    || interval.index >= BATTERY_ENERGY_FLOW_ANNUAL_RECORD_COUNT
    || !validIsoTimestamp(interval.timestampUtc)
    || !INTERVAL_NUMERIC_KEYS.every((key) =>
      Number.isFinite(interval[key] as number))
    || ![
      interval.generationKWh,
      interval.demandKWh,
      interval.solarToLoadKWh,
      interval.batteryChargeInputKWh,
      interval.batteryDischargeDeliveredKWh,
      interval.batterySocStartKWh,
      interval.batterySocAfterSelfDischargeKWh,
      interval.batterySocEndKWh,
      interval.selfDischargeLossKWh,
      interval.chargeConversionLossKWh,
      interval.dischargeConversionLossKWh,
      interval.gridImportKWh,
      interval.gridExportKWh,
      interval.curtailedKWh,
      interval.importCost,
      interval.exportRevenue,
      interval.carbonAvoidedKg,
    ].every((value) => value >= 0)
    || !within(interval.inputQualityScore, 0, 1)
  ) {
    return false;
  }

  const activeCapacity = battery.enabled ? battery.capacityKWh : 0;
  const expectedAfterSelfDischarge = activeCapacity > 0
    ? Math.max(
        battery.minimumSocKWh,
        interval.batterySocStartKWh
          * (1 - battery.selfDischargePerHour),
      )
    : 0;
  const expectedEndSoc =
    expectedAfterSelfDischarge
    + interval.batteryChargeInputKWh * battery.chargeEfficiency
    - interval.batteryDischargeDeliveredKWh
      / battery.dischargeEfficiency;
  const expectedPvResidual =
    interval.generationKWh
    - interval.solarToLoadKWh
    - interval.batteryChargeInputKWh
    - interval.gridExportKWh
    - interval.curtailedKWh;
  const expectedDemandResidual =
    interval.demandKWh
    - interval.solarToLoadKWh
    - interval.batteryDischargeDeliveredKWh
    - interval.gridImportKWh;
  const expectedSelfDischargeLoss =
    interval.batterySocStartKWh - expectedAfterSelfDischarge;
  const expectedChargeLoss =
    interval.batteryChargeInputKWh
    * (1 - battery.chargeEfficiency);
  const expectedDischargeLoss =
    interval.batteryDischargeDeliveredKWh
    / battery.dischargeEfficiency
    - interval.batteryDischargeDeliveredKWh;
  const dispatchFloor = Math.max(
    battery.minimumSocKWh,
    battery.reserveSocKWh,
  );
  const deliverableFromReserveKWh = Math.max(
    0,
    expectedAfterSelfDischarge - dispatchFloor,
  ) * battery.dischargeEfficiency;

  return batteryEnergyNumbersReconcile(
    interval.batterySocAfterSelfDischargeKWh,
    expectedAfterSelfDischarge,
  )
    && batteryEnergyNumbersReconcile(
      interval.batterySocEndKWh,
      expectedEndSoc,
    )
    && batteryEnergyNumbersReconcile(
      interval.selfDischargeLossKWh,
      expectedSelfDischargeLoss,
    )
    && batteryEnergyNumbersReconcile(
      interval.chargeConversionLossKWh,
      expectedChargeLoss,
    )
    && batteryEnergyNumbersReconcile(
      interval.dischargeConversionLossKWh,
      expectedDischargeLoss,
    )
    && batteryEnergyNumbersReconcile(
      interval.pvBalanceResidualKWh,
      expectedPvResidual,
    )
    && batteryEnergyNumbersReconcile(
      interval.demandBalanceResidualKWh,
      expectedDemandResidual,
    )
    && batteryEnergyNumbersReconcile(
      interval.socBalanceResidualKWh,
      interval.batterySocEndKWh - expectedEndSoc,
    )
    && batteryEnergyNumbersReconcile(
      interval.pvBalanceResidualKWh,
      0,
    )
    && batteryEnergyNumbersReconcile(
      interval.demandBalanceResidualKWh,
      0,
    )
    && batteryEnergyNumbersReconcile(
      interval.socBalanceResidualKWh,
      0,
    )
    && interval.batteryChargeInputKWh <= battery.maxChargeKW + 1e-8
    && interval.batteryDischargeDeliveredKWh
      <= battery.maxDischargeKW + 1e-8
    && interval.batteryDischargeDeliveredKWh
      <= deliverableFromReserveKWh + 1e-8
    && interval.gridExportKWh <= battery.gridExportLimitKW + 1e-8
    && !(
      interval.batteryChargeInputKWh > 1e-8
      && interval.batteryDischargeDeliveredKWh > 1e-8
    )
    && !(
      interval.gridImportKWh > 1e-8
      && interval.gridExportKWh > 1e-8
    )
    && !(
      interval.batteryChargeInputKWh > 1e-8
      && interval.gridImportKWh > 1e-8
    )
    && !(
      interval.batteryDischargeDeliveredKWh > 1e-8
      && interval.gridExportKWh > 1e-8
    )
    && within(
      interval.batterySocStartKWh,
      battery.minimumSocKWh - 1e-8,
      battery.maximumSocKWh + 1e-8,
    )
    && within(
      interval.batterySocAfterSelfDischargeKWh,
      battery.minimumSocKWh - 1e-8,
      battery.maximumSocKWh + 1e-8,
    )
    && within(
      interval.batterySocEndKWh,
      battery.minimumSocKWh - 1e-8,
      battery.maximumSocKWh + 1e-8,
    );
}

function intervalsReconcile(
  first: BatteryEnergyFlowIntervalV1,
  second: BatteryEnergyFlowIntervalV1,
): boolean {
  return first.index === second.index
    && first.timestampUtc === second.timestampUtc
    && INTERVAL_NUMERIC_KEYS.every((key) =>
      batteryEnergyNumbersReconcile(
        first[key] as number,
        second[key] as number,
      ));
}

function validAnnual(
  annual: BatteryEnergyFlowFrameV1["annual"],
  battery: BatteryEnergyFlowFrameV1["battery"],
): boolean {
  if (
    !Object.values(annual).every(
      (value) => typeof value === "number" && Number.isFinite(value),
    )
    || ![
      annual.generationKWh,
      annual.demandKWh,
      annual.solarToLoadKWh,
      annual.batteryChargeInputKWh,
      annual.batteryDischargeDeliveredKWh,
      annual.gridImportKWh,
      annual.gridExportKWh,
      annual.curtailedKWh,
      annual.generationRetainedOnSiteKWh,
      annual.localSupplyToLoadKWh,
      annual.importCost,
      annual.exportRevenue,
      annual.carbonAvoidedKg,
      annual.equivalentFullCycleThroughputProxy,
      annual.finalSocKWh,
    ].every((value) => value >= 0)
    || !within(annual.inputQualityScore, 0, 1)
  ) {
    return false;
  }
  const pvResidual =
    annual.generationKWh
    - annual.solarToLoadKWh
    - annual.batteryChargeInputKWh
    - annual.gridExportKWh
    - annual.curtailedKWh;
  const demandResidual =
    annual.demandKWh
    - annual.solarToLoadKWh
    - annual.batteryDischargeDeliveredKWh
    - annual.gridImportKWh;
  const activeCapacity = battery.enabled ? battery.capacityKWh : 0;
  const expectedCycleProxy = activeCapacity > 0
    ? (
        annual.batteryChargeInputKWh * battery.chargeEfficiency
        + annual.batteryDischargeDeliveredKWh
          / battery.dischargeEfficiency
      ) / (2 * activeCapacity)
    : 0;
  return batteryEnergyNumbersReconcile(
    annual.generationRetainedOnSiteKWh,
    annual.generationKWh
      - annual.gridExportKWh
      - annual.curtailedKWh,
  )
    && batteryEnergyNumbersReconcile(
      annual.localSupplyToLoadKWh,
      annual.solarToLoadKWh
        + annual.batteryDischargeDeliveredKWh,
    )
    && batteryEnergyNumbersReconcile(
      annual.equivalentFullCycleThroughputProxy,
      expectedCycleProxy,
    )
    && batteryEnergyNumbersReconcile(
      annual.pvBalanceResidualKWh,
      pvResidual,
    )
    && batteryEnergyNumbersReconcile(
      annual.demandBalanceResidualKWh,
      demandResidual,
    )
    && batteryEnergyNumbersReconcile(annual.pvBalanceResidualKWh, 0)
    && batteryEnergyNumbersReconcile(
      annual.demandBalanceResidualKWh,
      0,
    )
    && within(
      annual.finalSocKWh,
      battery.minimumSocKWh - 1e-8,
      battery.maximumSocKWh + 1e-8,
    );
}

export function validBatteryEnergyFlowFrame(
  frame: BatteryEnergyFlowFrameV1,
): boolean {
  const chronology = frame.chronology;
  const day = frame.linkedUtcDay;
  const linkedDayOffset =
    chronology.linkedIndex - chronology.linkedDayStartIndex;
  const linkedFromDay = day[linkedDayOffset];
  const linkedDate = chronology.linkedTimestampUtc.slice(0, 10);
  if (
    frame.schemaVersion !== BATTERY_ENERGY_FLOW_FRAME_SCHEMA_VERSION
    || !nonEmpty(frame.resultId)
    || !VALID_LIFECYCLES.has(frame.lifecycle)
    || chronology.recordCount !== BATTERY_ENERGY_FLOW_ANNUAL_RECORD_COUNT
    || chronology.intervalSeconds !== BATTERY_ENERGY_FLOW_INTERVAL_SECONDS
    || chronology.calendar !== "contiguous-no-leap-utc-year"
    || chronology.timestampRole !== "canonical-record-anchor"
    || chronology.intervalBoundaryAttribution !== "unavailable"
    || !Number.isInteger(chronology.linkedIndex)
    || chronology.linkedIndex < 0
    || chronology.linkedIndex >= chronology.recordCount
    || !validIsoTimestamp(chronology.linkedTimestampUtc)
    || !Number.isInteger(chronology.linkedDayStartIndex)
    || chronology.linkedDayStartIndex < 0
    || chronology.linkedDayRecordCount
      !== BATTERY_ENERGY_FLOW_LINKED_DAY_RECORD_COUNT
    || day.length !== BATTERY_ENERGY_FLOW_LINKED_DAY_RECORD_COUNT
    || linkedDayOffset < 0
    || linkedDayOffset >= day.length
    || !validBattery(frame.battery)
    || !validInterval(frame.linkedInterval, frame.battery)
    || !linkedFromDay
    || !intervalsReconcile(frame.linkedInterval, linkedFromDay)
    || frame.linkedInterval.index !== chronology.linkedIndex
    || frame.linkedInterval.timestampUtc
      !== chronology.linkedTimestampUtc
  ) {
    return false;
  }

  for (let offset = 0; offset < day.length; offset += 1) {
    const interval = day[offset];
    const prior = day[offset - 1];
    if (
      !interval
      || interval.index !== chronology.linkedDayStartIndex + offset
      || !validInterval(interval, frame.battery)
      || interval.timestampUtc.slice(0, 10) !== linkedDate
      || new Date(interval.timestampUtc).getUTCHours() !== offset
      || (
        offset > 0
        && (
          !prior
          || Date.parse(interval.timestampUtc)
            - Date.parse(prior.timestampUtc)
            !== BATTERY_ENERGY_FLOW_INTERVAL_SECONDS * 1_000
          || !batteryEnergyNumbersReconcile(
            interval.batterySocStartKWh,
            prior.batterySocEndKWh,
          )
        )
      )
    ) {
      return false;
    }
  }

  return validAnnual(frame.annual, frame.battery)
    && frame.dispatchBoundary.strategy === "greedy-self-consumption"
    && frame.dispatchBoundary.deterministic
    && frame.dispatchBoundary.acSideEnergyAccounting
    && frame.dispatchBoundary.oneHourEnergyAccounting
    && !frame.dispatchBoundary.measuredTelemetry
    && !frame.dispatchBoundary.liveControl
    && !frame.dispatchBoundary.gridCharging
    && !frame.dispatchBoundary.batteryExportToGrid
    && !frame.dispatchBoundary.autonomousController
    && !frame.dispatchBoundary.tariffOptimized
    && !frame.dispatchBoundary.forecastAware
    && !frame.dispatchBoundary.islandingModel
    && !frame.dispatchBoundary.issuedSchedule
    && !frame.dispatchBoundary.bankableAssessment
    && frame.visualEncoding.kind
      === "normalized-logical-energy-allocation-schematic"
    && frame.visualEncoding.magnitudeBasis
      === "linked-utc-day-accumulated-energy"
    && frame.visualEncoding.oneGridIntertie
    && frame.visualEncoding.boundedBatteryReservoir
    && frame.visualEncoding.directionEncoding
    && !frame.visualEncoding.physicalTopology
    && !frame.visualEncoding.livePowerFlow
    && !frame.visualEncoding.animatedParticles
    && frame.visualEncoding.exactValuesRemainHtml
    && nonEmpty(frame.units.currency)
    && nonEmpty(frame.provenance.provider)
    && nonEmpty(frame.provenance.datasetVersion)
    && nonEmpty(frame.provenance.calculationVersion)
    && nonEmpty(frame.provenance.scenarioVersion)
    && frame.provenance.evidenceRefIds.length >= 6
    && new Set(frame.provenance.evidenceRefIds).size
      === frame.provenance.evidenceRefIds.length
    && frame.provenance.evidenceRefIds.every(nonEmpty)
    && Object.keys(frame.unavailableLayers).length
      === BATTERY_ENERGY_FLOW_UNAVAILABLE_LAYER_KEYS.length
    && BATTERY_ENERGY_FLOW_UNAVAILABLE_LAYER_KEYS.every(
      (key) => validUnavailableLayer(frame.unavailableLayers[key]),
    );
}

export function deepFreezeBatteryEnergyFlowFrame(
  frame: BatteryEnergyFlowFrameV1,
): BatteryEnergyFlowFrameV1 {
  const freeze = <T>(value: T): T => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    for (const child of Object.values(value)) freeze(child);
    return Object.freeze(value);
  };
  return freeze(frame);
}
