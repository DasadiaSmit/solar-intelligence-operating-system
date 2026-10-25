"use client";

import {
  activationRequestForObservatoryPosition,
} from "@/features/application-activation";
import type {
  AtmosphericObservationFrameBuildResult,
} from "@/features/visual-computing/atmospheric-observation-frame";
import type {
  AnnualEnergyFrameBuildResult,
} from "@/features/visual-computing/annual-energy-frame";
import {
  deriveAnnualEnergyView,
} from "@/features/visual-computing/annual-energy-view";
import type {
  ArrayEngineeringFrameBuildResult,
} from "@/features/visual-computing/array-engineering-frame";
import {
  deriveArrayEngineeringView,
} from "@/features/visual-computing/array-engineering-view";
import type {
  BatteryEnergyFlowFrameBuildResult,
} from "@/features/visual-computing/battery-energy-flow-frame";
import {
  deriveBatteryEnergyFlowView,
} from "@/features/visual-computing/battery-energy-flow-view";
import type {
  ScenarioComparisonFrameBuildResult,
} from "@/features/visual-computing/scenario-comparison-frame";
import {
  deriveScenarioComparisonView,
} from "@/features/visual-computing/scenario-comparison-view";
import {
  deriveAtmosphericObservationView,
} from "@/features/visual-computing/atmospheric-observation-view";
import {
  instrumentMountAtPosition,
} from "@/features/visual-computing/observatory-instrument-registry";
import {
  OBSERVATORY_ACTIVE_POSITION_COUNT,
  OBSERVATORY_POSITIONS,
} from "@/features/visual-computing/observatory-model";
import type {
  SceneFrameBuildResult,
} from "@/features/visual-computing/scene-frame";
import {
  deriveSolarDigitalTwinView,
  type SolarDigitalTwinViewV1,
} from "@/features/visual-computing/solar-digital-twin-view";
import { AtmosphericObservationReadout } from "./AtmosphericObservationReadout";
import { AnnualEnergyReadout } from "./AnnualEnergyReadout";
import { ArrayEngineeringReadout } from "./ArrayEngineeringReadout";
import { BatteryEnergyFlowReadout } from "./BatteryEnergyFlowReadout";
import { ScenarioComparisonReadout } from "./ScenarioComparisonReadout";
import { useObservatoryStateManager } from "./ObservatoryStateManager";
import styles from "./Observatory.module.css";

const READOUT_TITLE_ID = "observatory-readout-title";
const READOUT_LIMITATION_ID = "observatory-readout-limitation";

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

function number(value: number, digits = 1): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: digits,
  }).format(value);
}

function linkedTime(timestampUtc: string): string {
  const date = new Date(timestampUtc);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(date)
    : timestampUtc;
}

function InstrumentFacts({
  view,
}: {
  readonly view: SolarDigitalTwinViewV1;
}) {
  return (
    <>
      <p className={styles.instrumentSummary}>
        Configured-orientation system schematic for one linked representative
        hour. It explains collection, conversion, demand, storage, and grid
        interfaces; it is not a surveyed physical replica.
      </p>
      <dl className={styles.instrumentFacts}>
        <div>
          <dt>Linked time</dt>
          <dd>{linkedTime(view.timestampUtc)} UTC</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{view.lifecycle}</dd>
        </div>
        <div>
          <dt>GHI / effective POA</dt>
          <dd>
            {number(view.irradiance.ghiWm2, 0)} /{" "}
            {number(view.irradiance.effectivePoaWm2, 0)}{" "}
            {view.units.irradiance}
          </dd>
        </div>
        <div>
          <dt>AC / demand</dt>
          <dd>
            {number(view.energy.acEnergyKWh, 2)} /{" "}
            {number(view.energy.demandEnergyKWh, 2)}{" "}
            {view.units.intervalEnergy}
          </dd>
        </div>
        <div>
          <dt>Battery / grid in / grid out</dt>
          <dd>
            {number(view.energy.batteryStateOfChargeKWh, 2)}{" "}
            {view.units.batteryState} /{" "}
            {number(view.energy.gridImportEnergyKWh, 2)} /{" "}
            {number(view.energy.gridExportEnergyKWh, 2)}{" "}
            {view.units.intervalEnergy}
          </dd>
        </div>
        <div>
          <dt>Configured array</dt>
          <dd>
            {number(view.array.capacityKwDc, 1)} kWp ·{" "}
            {number(view.array.tiltDeg, 1)}° tilt ·{" "}
            {number(view.array.azimuthDeg, 1)}° azimuth
          </dd>
        </div>
        <div>
          <dt>Atmosphere / quality</dt>
          <dd>
            {number(view.weather.ambientTemperatureC, 1)}{" "}
            {view.units.temperature} ·{" "}
            {number(view.weather.cloudFraction * 100, 0)}% cloud ·{" "}
            {number(view.weather.qualityScore * 100, 0)}% quality
          </dd>
        </div>
      </dl>
      <p className={styles.provenanceLine}>
        {view.provenance.provider} · dataset{" "}
        {view.provenance.datasetVersion} · calculation{" "}
        {view.provenance.calculationVersion} ·{" "}
        {view.provenance.evidenceRefIds.length} evidence references
      </p>
      <p
        id={READOUT_LIMITATION_ID}
        className={styles.readoutLimitation}
      >
        Unavailable and not synthesized: physical module layout, terrain,
        surveyed horizon, direct and diffuse irradiance, and ground-reflected
        irradiance. Exact analytical values remain authoritative in HTML.
      </p>
    </>
  );
}

export interface ObservatoryReadoutProps {
  readonly annualEnergy: AnnualEnergyFrameBuildResult;
  readonly arrayEngineering: ArrayEngineeringFrameBuildResult;
  readonly atmosphericObservation:
    AtmosphericObservationFrameBuildResult;
  readonly batteryEnergyFlow: BatteryEnergyFlowFrameBuildResult;
  readonly scenarioComparison: ScenarioComparisonFrameBuildResult;
  readonly scene: SceneFrameBuildResult;
}

export function ObservatoryReadout({
  annualEnergy,
  arrayEngineering,
  atmosphericObservation,
  batteryEnergyFlow,
  scenarioComparison,
  scene,
}: ObservatoryReadoutProps) {
  const {
    state,
    reducedMotion,
    linkedSelectedIndex,
    enterApplication,
  } = useObservatoryStateManager();
  const currentPosition =
    OBSERVATORY_POSITIONS.find(
      (position) => position.index === state.activePositionIndex,
    )
    ?? OBSERVATORY_POSITIONS[0];
  if (!currentPosition) return null;

  const mount = instrumentMountAtPosition(currentPosition.index);
  const instrumentKey = mount?.instrumentKey ?? null;
  const digitalTwinView = deriveSolarDigitalTwinView(scene);
  const atmosphericView = deriveAtmosphericObservationView(
    atmosphericObservation,
  );
  const annualEnergyView = deriveAnnualEnergyView(annualEnergy);
  const arrayEngineeringView = deriveArrayEngineeringView(
    arrayEngineering,
  );
  const scenarioComparisonView = deriveScenarioComparisonView(
    scenarioComparison,
  );
  const batteryEnergyFlowView = deriveBatteryEnergyFlowView(
    batteryEnergyFlow,
  );
  const activationRequest = activationRequestForObservatoryPosition(
    currentPosition.index,
    linkedSelectedIndex,
  );
  const mounted = mount?.mountStatus === "mounted";
  const emphasizeEntry =
    reducedMotion
    || mounted
    || currentPosition.index === OBSERVATORY_ACTIVE_POSITION_COUNT - 1
    || state.phase === "handoff";
  const actionLabel =
    instrumentKey === "solar-digital-twin"
      ? "Open Solar Digital Twin workspace"
      : instrumentKey === "atmospheric-observation"
        ? "Open Weather and Atmosphere workspace"
        : instrumentKey === "annual-energy-observatory"
          ? "Open Annual Energy Forecast workspace"
          : instrumentKey === "solar-array-engineering"
            ? "Open Solar Array Engineering controls"
            : instrumentKey === "scenario-comparison"
              ? "Open Scenario & Resilience workspace"
              : instrumentKey === "battery-energy-flow"
                ? "Open Battery & Energy-Flow workspace"
            : "Enter existing analytical workspace";

  return (
    <section
      className={styles.readout}
      aria-labelledby={READOUT_TITLE_ID}
      tabIndex={0}
      data-position-index={currentPosition.ordinal}
      data-entry-emphasis={emphasizeEntry ? "strong" : "standard"}
      data-instrument-status={mount?.mountStatus ?? "reserved"}
    >
      <p className={styles.readoutCoordinate}>
        POSITION {twoDigits(currentPosition.ordinal)} / 14
      </p>
      <h2 id={READOUT_TITLE_ID}>{currentPosition.label}</h2>
      {instrumentKey === "solar-digital-twin" ? (
        digitalTwinView.status === "ready" ? (
          <InstrumentFacts view={digitalTwinView.view} />
        ) : (
          <p
            id={READOUT_LIMITATION_ID}
            className={styles.readoutLimitation}
          >
            {digitalTwinView.summary} Open the existing Digital Twin workspace
            for the complete non-WebGL analytical path.
          </p>
        )
      ) : instrumentKey === "atmospheric-observation" ? (
        atmosphericView.status === "ready" ? (
          <AtmosphericObservationReadout
            limitationId={READOUT_LIMITATION_ID}
            view={atmosphericView.view}
          />
        ) : (
          <p
            id={READOUT_LIMITATION_ID}
            className={styles.readoutLimitation}
          >
            {atmosphericView.summary} Open the existing Weather and
            Atmosphere workspace for the analytical HTML path.
          </p>
        )
      ) : instrumentKey === "annual-energy-observatory" ? (
        annualEnergyView.status === "ready" ? (
          <AnnualEnergyReadout
            limitationId={READOUT_LIMITATION_ID}
            view={annualEnergyView.view}
          />
        ) : (
          <p
            id={READOUT_LIMITATION_ID}
            className={styles.readoutLimitation}
          >
            {annualEnergyView.summary} Open the existing Annual Energy
            Forecast workspace for the complete non-WebGL analytical path.
          </p>
        )
      ) : instrumentKey === "solar-array-engineering" ? (
        arrayEngineeringView.status === "ready" ? (
          <ArrayEngineeringReadout
            limitationId={READOUT_LIMITATION_ID}
            view={arrayEngineeringView.view}
          />
        ) : (
          <p
            id={READOUT_LIMITATION_ID}
            className={styles.readoutLimitation}
          >
            {arrayEngineeringView.summary} Open the existing Solar Array
            Engineering workspace and Scenario controls for the complete
            non-WebGL analytical path.
          </p>
        )
      ) : instrumentKey === "scenario-comparison" ? (
        scenarioComparisonView.status === "ready" ? (
          <ScenarioComparisonReadout
            limitationId={READOUT_LIMITATION_ID}
            view={scenarioComparisonView.view}
          />
        ) : (
          <p
            id={READOUT_LIMITATION_ID}
            className={styles.readoutLimitation}
          >
            {scenarioComparisonView.summary} Open the existing Scenario &
            Resilience workspace for the complete non-WebGL analytical path.
          </p>
        )
      ) : instrumentKey === "battery-energy-flow" ? (
        batteryEnergyFlowView.status === "ready" ? (
          <BatteryEnergyFlowReadout
            limitationId={READOUT_LIMITATION_ID}
            view={batteryEnergyFlowView.view}
          />
        ) : (
          <p
            id={READOUT_LIMITATION_ID}
            className={styles.readoutLimitation}
          >
            {batteryEnergyFlowView.summary} Open the existing Battery &
            Energy-Flow workspace for the complete non-WebGL analytical path.
          </p>
        )
      ) : (
        <p
          id={READOUT_LIMITATION_ID}
          className={styles.readoutLimitation}
        >
          Framework navigation only. This position remains an unmounted
          placeholder in the current increment.
        </p>
      )}
      {reducedMotion && (
        <p className={styles.motionNotice}>
          Reduced motion is active. Position changes use a stable,
          non-animated observatory pose.
        </p>
      )}
      <button
        className={styles.enterApplication}
        type="button"
        aria-describedby={READOUT_LIMITATION_ID}
        onClick={() =>
          enterApplication(activationRequest ?? true)
        }
      >
        {actionLabel}
      </button>
    </section>
  );
}
