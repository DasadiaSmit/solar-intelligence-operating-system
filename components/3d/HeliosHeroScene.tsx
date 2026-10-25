"use client";

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
import type {
  SceneFrameBuildResult,
} from "@/features/visual-computing/scene-frame";
import type {
  LazyBatteryEnergyFlowInstrument,
  LazyScenarioComparisonInstrument,
} from "./instruments/types";
import {
  ObservatorySceneManager,
} from "./ObservatorySceneManager";

export interface HeliosHeroSceneProps {
  readonly active: boolean;
  readonly annualEnergy: AnnualEnergyFrameBuildResult;
  readonly arrayEngineering: ArrayEngineeringFrameBuildResult;
  readonly atmosphericObservation:
    AtmosphericObservationFrameBuildResult;
  readonly batteryEnergyFlow: BatteryEnergyFlowFrameBuildResult;
  readonly batteryEnergyFlowInstrument:
    LazyBatteryEnergyFlowInstrument;
  readonly scenarioComparison: ScenarioComparisonFrameBuildResult;
  readonly scenarioComparisonInstrument:
    LazyScenarioComparisonInstrument;
  readonly scene: SceneFrameBuildResult;
  readonly state: ObservatoryPresentationState;
}

/**
 * Stable lazy-load boundary retained from Milestone 2. The persistent scene
 * manager now coordinates both Hero and Observatory inside the same canvas.
 */
export default function HeliosHeroScene(
  props: HeliosHeroSceneProps,
) {
  return <ObservatorySceneManager {...props} />;
}
