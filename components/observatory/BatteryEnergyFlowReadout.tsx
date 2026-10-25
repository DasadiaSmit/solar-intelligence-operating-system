import type {
  BatteryEnergyFlowViewV1,
} from "@/features/visual-computing/battery-energy-flow-view";
import styles from "./Observatory.module.css";

export interface BatteryEnergyFlowReadoutProps {
  readonly limitationId: string;
  readonly view: BatteryEnergyFlowViewV1;
}

const UNAVAILABLE_LAYER_LABELS = [
  [
    "instantaneousPowerAndIntraHourDirection",
    "Instantaneous power, ramps, and intra-hour direction",
  ],
  [
    "physicalWiringAndMeterTopology",
    "Physical wiring, inverter, meter, and switchgear topology",
  ],
  [
    "measuredPlantOrInverterTelemetry",
    "Measured plant, inverter, battery, load, and grid telemetry",
  ],
  [
    "bmsVoltageCurrentTemperatureAndAlarms",
    "BMS voltage, current, temperature, and alarms",
  ],
  [
    "stateOfHealthDegradationWarrantyAndLifetime",
    "State of health, degradation, warranty use, and lifetime",
  ],
  [
    "protectionCellBalancingAndControllerDynamics",
    "Protection, cell balancing, converter, and controller dynamics",
  ],
  [
    "dynamicTariffCarbonMarketAndGridEvents",
    "Dynamic tariff, carbon, market, congestion, and grid events",
  ],
  ["dispatchUncertainty", "Calibrated dispatch uncertainty"],
  [
    "alternativeOptimizationTrajectories",
    "Forecast-aware, tariff-optimal, MPC, or autonomous trajectories",
  ],
  [
    "outageIslandingBackupAndBlackStart",
    "Outage, islanding, backup, black-start, and reliability behavior",
  ],
  [
    "attributableIntervalStartAndEnd",
    "Attributable interval-start and interval-end semantics",
  ],
] as const satisfies readonly (
  readonly [
    keyof BatteryEnergyFlowViewV1["unavailableLayers"],
    string,
  ]
)[];

function number(value: number, digits = 3): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: digits,
  }).format(value);
}

function timestamp(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
        timeZoneName: "short",
      }).format(date)
    : value;
}

function currency(value: number, code: string): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${number(value, 2)} ${code}`;
  }
}

export function BatteryEnergyFlowReadout({
  limitationId,
  view,
}: BatteryEnergyFlowReadoutProps) {
  const linked = view.linkedInterval;
  const limitationTitleId = `${limitationId}-title`;
  return (
    <>
      <p
        className={styles.instrumentSummary}
        data-dispatch-strategy={view.dispatchBoundary.strategy}
        data-live-control={String(view.dispatchBoundary.liveControl)}
        data-measured-telemetry={String(
          view.dispatchBoundary.measuredTelemetry,
        )}
      >
        <strong>SIMULATED greedy self-consumption dispatch</strong> for one
        linked 3,600-second canonical record. Every route value is interval
        energy, not instantaneous power, live plant flow, battery telemetry,
        or an autonomous control instruction.
      </p>
      <p className={styles.instrumentSummary}>
        The spatial schematic uses accumulated energy across the linked UTC
        day to keep active and dormant allocation paths understandable. It
        shows one logical grid intertie and a bounded state-of-charge
        reservoir, not physical wiring. Exact linked-record and annual
        ledgers remain authoritative below.
      </p>

      <dl className={styles.instrumentFacts}>
        <div>
          <dt>Linked record anchor</dt>
          <dd>
            {timestamp(linked.timestampUtc)} · index {linked.index} ·{" "}
            {view.chronology.intervalSeconds} seconds
          </dd>
        </div>
        <div>
          <dt>Dispatch status / method</dt>
          <dd>
            {view.lifecycle} · greedy self-consumption · deterministic
          </dd>
        </div>
        <div>
          <dt>PV AC generation / on-site demand</dt>
          <dd>
            {number(linked.generationKWh)} /{" "}
            {number(linked.demandKWh)} {view.units.intervalEnergy}
          </dd>
        </div>
        <div>
          <dt>PV direct to load</dt>
          <dd>
            {number(linked.solarToLoadKWh)}{" "}
            {view.units.intervalEnergy}
          </dd>
        </div>
        <div>
          <dt>Battery charge input / discharge to load</dt>
          <dd>
            {number(linked.batteryChargeInputKWh)} /{" "}
            {number(linked.batteryDischargeDeliveredKWh)}{" "}
            {view.units.intervalEnergy}
          </dd>
        </div>
        <div>
          <dt>Battery SOC start / after self-discharge / end</dt>
          <dd>
            {number(linked.batterySocStartKWh)} /{" "}
            {number(linked.batterySocAfterSelfDischargeKWh)} /{" "}
            {number(linked.batterySocEndKWh)}{" "}
            {view.units.batteryState}
          </dd>
        </div>
        <div>
          <dt>Grid import / export</dt>
          <dd>
            {number(linked.gridImportKWh)} /{" "}
            {number(linked.gridExportKWh)}{" "}
            {view.units.intervalEnergy}
          </dd>
        </div>
        <div>
          <dt>Curtailed PV</dt>
          <dd>
            {number(linked.curtailedKWh)} {view.units.intervalEnergy}
          </dd>
        </div>
        <div>
          <dt>PV / demand / SOC balance residual</dt>
          <dd>
            {number(linked.pvBalanceResidualKWh, 8)} /{" "}
            {number(linked.demandBalanceResidualKWh, 8)} /{" "}
            {number(linked.socBalanceResidualKWh, 8)} kWh
          </dd>
        </div>
        <div>
          <dt>Battery capacity / operating SOC band</dt>
          <dd>
            {number(view.battery.capacityKWh)} kWh ·{" "}
            {number(view.battery.minimumSocKWh)}–{" "}
            {number(view.battery.maximumSocKWh)} kWh · reserve{" "}
            {number(view.battery.reserveSocKWh)} kWh
          </dd>
        </div>
        <div>
          <dt>Charge / discharge limits</dt>
          <dd>
            {number(view.battery.maxChargeKW)} /{" "}
            {number(view.battery.maxDischargeKW)}{" "}
            {view.units.configuredPowerLimit}
          </dd>
        </div>
        <div>
          <dt>Charge / discharge efficiency</dt>
          <dd>
            {number(view.battery.chargeEfficiency * 100, 2)}% /{" "}
            {number(view.battery.dischargeEfficiency * 100, 2)}% ·
            self-discharge{" "}
            {number(view.battery.selfDischargePerHour * 100, 5)}% / hour
          </dd>
        </div>
        <div>
          <dt>Input and weather quality</dt>
          <dd>
            {number(linked.inputQualityScore, 3)} ·{" "}
            {view.units.quality}
          </dd>
        </div>
        <div>
          <dt>Timestamp boundary</dt>
          <dd>
            canonical record anchor · interval start/end attribution
            unavailable
          </dd>
        </div>
      </dl>

      <div className={styles.flowTableRegion}>
        <table className={styles.flowTable}>
          <caption>
            Logical energy-allocation routes for the linked record and UTC day
          </caption>
          <thead>
            <tr>
              <th scope="col">Route</th>
              <th scope="col">Linked record</th>
              <th scope="col">Linked UTC day</th>
              <th scope="col">State</th>
            </tr>
          </thead>
          <tbody>
            {view.spatial.routes.map((route) => (
              <tr key={route.id}>
                <th scope="row">{route.label}</th>
                <td>
                  {number(route.linkedIntervalEnergyKWh)} kWh / 1h
                </td>
                <td>{number(route.linkedDayEnergyKWh)} kWh / day</td>
                <td>
                  {route.activeInLinkedInterval
                    ? "active in linked record"
                    : route.activeInLinkedDay
                      ? "day context only"
                      : "dormant in linked day"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className={styles.instrumentFacts}>
        <div>
          <dt>Annual generation / demand</dt>
          <dd>
            {number(view.annual.generationKWh, 1)} /{" "}
            {number(view.annual.demandKWh, 1)}{" "}
            {view.units.annualEnergy}
          </dd>
        </div>
        <div>
          <dt>Generation retained on site</dt>
          <dd>
            {number(view.annual.generationRetainedOnSiteKWh, 1)}{" "}
            {view.units.annualEnergy}; includes PV sent to the charger
          </dd>
        </div>
        <div>
          <dt>Local supply delivered to load</dt>
          <dd>
            {number(view.annual.localSupplyToLoadKWh, 1)}{" "}
            {view.units.annualEnergy}; PV direct plus battery discharge
          </dd>
        </div>
        <div>
          <dt>Annual import / export / curtailment</dt>
          <dd>
            {number(view.annual.gridImportKWh, 1)} /{" "}
            {number(view.annual.gridExportKWh, 1)} /{" "}
            {number(view.annual.curtailedKWh, 1)}{" "}
            {view.units.annualEnergy}
          </dd>
        </div>
        <div>
          <dt>Equivalent-full-cycle throughput proxy</dt>
          <dd>
            {number(
              view.annual.equivalentFullCycleThroughputProxy,
              3,
            )} cycles · not a lifetime or warranty prediction
          </dd>
        </div>
        <div>
          <dt>Annual import cost / export revenue</dt>
          <dd>
            {currency(view.annual.importCost, view.units.currency)} /{" "}
            {currency(view.annual.exportRevenue, view.units.currency)}
          </dd>
        </div>
        <div>
          <dt>Annual carbon displacement accounting</dt>
          <dd>
            {number(view.annual.carbonAvoidedKg, 1)}{" "}
            {view.units.carbon}
          </dd>
        </div>
        <div>
          <dt>Annual PV / demand balance residual</dt>
          <dd>
            {number(view.annual.pvBalanceResidualKWh, 8)} /{" "}
            {number(view.annual.demandBalanceResidualKWh, 8)} kWh
          </dd>
        </div>
      </dl>

      <p className={styles.instrumentSummary}>
        Opening the Battery workspace preserves any device-local scenario
        branch. A modified branch is a separate client screening calculation
        and may differ from this fixed canonical frame.
      </p>
      <p className={styles.provenanceLine}>
        {view.provenance.provider} · dataset{" "}
        {view.provenance.datasetVersion} · calculation{" "}
        {view.provenance.calculationVersion} · scenario{" "}
        {view.provenance.scenarioVersion} · evidence{" "}
        {view.provenance.evidenceRefIds.join(", ")}
      </p>
      <section
        id={limitationId}
        className={styles.readoutLimitation}
        aria-labelledby={limitationTitleId}
      >
        <h3 id={limitationTitleId}>Unavailable and not synthesized</h3>
        <ul>
          {UNAVAILABLE_LAYER_LABELS.map(([key, label]) => (
            <li key={key}>
              <strong>{label}:</strong>{" "}
              {view.unavailableLayers[key].reason}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
