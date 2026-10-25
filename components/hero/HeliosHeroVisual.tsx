"use client";

import { lazy, type CSSProperties } from "react";
import { HeliosCanvas } from "@/components/3d/HeliosCanvas";
import type {
  HeliosCameraConfiguration,
} from "@/components/3d/types";
import type {
  LazyBatteryEnergyFlowInstrument as LazyBatteryEnergyFlowInstrumentType,
  LazyScenarioComparisonInstrument as LazyScenarioComparisonInstrumentType,
} from "@/components/3d/instruments/types";
import type {
  ObservatoryPresentationState,
} from "@/features/visual-computing/observatory-model";
import type {
  AtmosphericObservationFrameBuildResult,
} from "@/features/visual-computing/atmospheric-observation-frame";
import type {
  AnnualEnergyFrameBuildResult,
} from "@/features/visual-computing/annual-energy-frame";
import type {
  ArrayEngineeringFrameBuildResult,
} from "@/features/visual-computing/array-engineering-frame";
import type {
  BatteryEnergyFlowFrameBuildResult,
} from "@/features/visual-computing/battery-energy-flow-frame";
import type {
  ScenarioComparisonFrameBuildResult,
} from "@/features/visual-computing/scenario-comparison-frame";
import type { SceneFrameBuildResult } from "@/features/visual-computing/scene-frame";
import styles from "./HeliosHeroVisual.module.css";

const LazyHeliosHeroScene = lazy(
  () => import("@/components/3d/HeliosHeroScene"),
);
const LazyScenarioComparisonInstrument:
LazyScenarioComparisonInstrumentType = lazy(
  () => import("@/components/3d/instruments/ScenarioComparisonInstrument"),
);
const LazyBatteryEnergyFlowInstrument:
LazyBatteryEnergyFlowInstrumentType = lazy(
  () => import("@/components/3d/instruments/BatteryEnergyFlowInstrument"),
);

const OBSERVATORY_CANVAS_CAMERA: HeliosCameraConfiguration =
  Object.freeze({
    position: Object.freeze([0, 0, 6.8] as const),
    target: Object.freeze([0, 0, 0] as const),
    fovDeg: 32,
    near: 0.1,
    far: 80,
  });

interface HeliosHeroVisualProps {
  readonly active: boolean;
  readonly annualEnergy: AnnualEnergyFrameBuildResult;
  readonly arrayEngineering: ArrayEngineeringFrameBuildResult;
  readonly atmosphericObservation:
    AtmosphericObservationFrameBuildResult;
  readonly batteryEnergyFlow: BatteryEnergyFlowFrameBuildResult;
  readonly scenarioComparison: ScenarioComparisonFrameBuildResult;
  readonly scene: SceneFrameBuildResult;
  readonly state: ObservatoryPresentationState;
}

type HeroVisualStyle = CSSProperties & {
  readonly "--hero-core-scale": number;
  readonly "--hero-core-shift": string;
  readonly "--hero-ring-primary": string;
  readonly "--hero-ring-secondary": string;
  readonly "--observatory-dial-rotation": string;
};

function fallbackDescription(
  scene: SceneFrameBuildResult,
  atmosphericObservation: AtmosphericObservationFrameBuildResult,
  annualEnergy: AnnualEnergyFrameBuildResult,
  arrayEngineering: ArrayEngineeringFrameBuildResult,
  batteryEnergyFlow: BatteryEnergyFlowFrameBuildResult,
  scenarioComparison: ScenarioComparisonFrameBuildResult,
): string {
  if (scene.status === "unavailable") {
    return `A procedural Helios Core represents the operating system. ${scene.summary}`;
  }
  const atmosphericStatus =
    atmosphericObservation.status === "ready"
      ? "position two contains an evidence-linked Atmospheric Observation schematic;"
      : `position two reports its atmospheric layer unavailable: ${atmosphericObservation.summary}`;
  const annualStatus =
    annualEnergy.status === "ready"
      ? "position three contains an 8,760-sample Annual Energy Observatory;"
      : `position three reports its annual layer unavailable: ${annualEnergy.summary}`;
  const arrayStatus =
    arrayEngineering.status === "ready"
      ? "position four contains a normalized ENU Solar Array Engineering orientation rig;"
      : `position four reports its array-engineering layer unavailable: ${arrayEngineering.summary}`;
  const scenarioStatus =
    scenarioComparison.status === "ready"
      ? "position five contains five normalized deterministic Scenario Comparison chambers;"
      : `position five reports its scenario-comparison layer unavailable: ${scenarioComparison.summary}`;
  const batteryStatus =
    batteryEnergyFlow.status === "ready"
      ? "position six contains a logical canonical Battery and Energy-Flow routing schematic;"
      : `position six reports its battery energy-flow layer unavailable: ${batteryEnergyFlow.summary}`;
  return [
    "A procedural Helios Core represents the operating system and its",
    `linked scientific frame at ${scene.frame.timestampUtc}.`,
    "A fourteen-position structural Observatory dial surrounds the Core;",
    "position one contains a configured-orientation Solar Digital Twin",
    "schematic;",
    atmosphericStatus,
    annualStatus,
    arrayStatus,
    scenarioStatus,
    batteryStatus,
    "position seven remains a framework placeholder,",
    "and positions eight through fourteen are reserved.",
    "The numerical HTML summary remains authoritative.",
  ].join(" ");
}

function HeliosVisualFallback({
  annualEnergy,
  arrayEngineering,
  atmosphericObservation,
  batteryEnergyFlow,
  scenarioComparison,
  scene,
}: Pick<
  HeliosHeroVisualProps,
  "atmosphericObservation" | "scene"
  | "annualEnergy"
  | "arrayEngineering"
  | "batteryEnergyFlow"
  | "scenarioComparison"
>) {
  return (
    <figure className={styles.visualFallback}>
      <div className={styles.fallbackCore} aria-hidden="true">
        <span className={`${styles.fallbackRing} ${styles.ringPrimary}`} />
        <span className={`${styles.fallbackRing} ${styles.ringSecondary}`} />
        <span className={`${styles.fallbackRing} ${styles.ringTertiary}`} />
        <span className={styles.fallbackSun} />
      </div>
      <figcaption className={styles.screenReaderOnly}>
        {fallbackDescription(
          scene,
          atmosphericObservation,
          annualEnergy,
          arrayEngineering,
          batteryEnergyFlow,
          scenarioComparison,
        )}
      </figcaption>
    </figure>
  );
}

export function HeliosHeroVisual({
  active,
  annualEnergy,
  arrayEngineering,
  atmosphericObservation,
  batteryEnergyFlow,
  scenarioComparison,
  scene,
  state,
}: HeliosHeroVisualProps) {
  const safeHeroProgress = Number.isFinite(state.heroProgress)
    ? Math.max(0, Math.min(1, state.heroProgress))
    : 0;
  const style: HeroVisualStyle = {
    "--hero-core-scale": 1 - safeHeroProgress * 0.14,
    "--hero-core-shift": `${safeHeroProgress * -4}vw`,
    "--hero-ring-primary": `${safeHeroProgress * 24}deg`,
    "--hero-ring-secondary": `${safeHeroProgress * -18}deg`,
    "--observatory-dial-rotation": `${state.dialRotationRad}rad`,
  };

  if (scene.status === "unavailable") {
    return (
      <div
        className={styles.visualLayer}
        style={style}
        data-visual-phase={state.phase}
      >
        <div className={styles.canvas}>
          <HeliosVisualFallback
            annualEnergy={annualEnergy}
            arrayEngineering={arrayEngineering}
            atmosphericObservation={atmosphericObservation}
            batteryEnergyFlow={batteryEnergyFlow}
            scenarioComparison={scenarioComparison}
            scene={scene}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.visualLayer}
      style={style}
      data-visual-phase={state.phase}
    >
      <HeliosCanvas
        className={styles.canvas}
        accessibleLabel={fallbackDescription(
          scene,
          atmosphericObservation,
          annualEnergy,
          arrayEngineering,
          batteryEnergyFlow,
          scenarioComparison,
        )}
        fallback={(
          <HeliosVisualFallback
            annualEnergy={annualEnergy}
            arrayEngineering={arrayEngineering}
            atmosphericObservation={atmosphericObservation}
            batteryEnergyFlow={batteryEnergyFlow}
            scenarioComparison={scenarioComparison}
            scene={scene}
          />
        )}
        camera={OBSERVATORY_CANVAS_CAMERA}
      >
        <LazyHeliosHeroScene
          active={active}
          annualEnergy={annualEnergy}
          arrayEngineering={arrayEngineering}
          atmosphericObservation={atmosphericObservation}
          batteryEnergyFlow={batteryEnergyFlow}
          batteryEnergyFlowInstrument={LazyBatteryEnergyFlowInstrument}
          scenarioComparison={scenarioComparison}
          scenarioComparisonInstrument={LazyScenarioComparisonInstrument}
          scene={scene}
          state={state}
        />
      </HeliosCanvas>
    </div>
  );
}
