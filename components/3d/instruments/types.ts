import type {
  ComponentType,
  LazyExoticComponent,
} from "react";
import type {
  ObservatoryInstrumentPresentationState,
} from "@/features/visual-computing/observatory-instrument-presentation";
import type {
  ObservatoryInstrumentKey,
} from "@/features/visual-computing/observatory-instrument-registry";
import type {
  AtmosphericObservationViewResult,
} from "@/features/visual-computing/atmospheric-observation-view";
import type {
  AnnualEnergyViewResult,
} from "@/features/visual-computing/annual-energy-view";
import type {
  ArrayEngineeringViewResult,
} from "@/features/visual-computing/array-engineering-view";
import type {
  SolarDigitalTwinViewResult,
} from "@/features/visual-computing/solar-digital-twin-view";
import type {
  ScenarioComparisonFrameBuildResult,
} from "@/features/visual-computing/scenario-comparison-frame";
import type {
  BatteryEnergyFlowFrameBuildResult,
} from "@/features/visual-computing/battery-energy-flow-frame";
import type {
  VisualQualityTier,
} from "@/features/visual-computing/renderer-policy";

export interface ScenarioComparisonInstrumentProps {
  readonly qualityTier?: VisualQualityTier;
  readonly result: ScenarioComparisonFrameBuildResult;
}

export interface BatteryEnergyFlowInstrumentProps {
  readonly qualityTier?: VisualQualityTier;
  readonly result: BatteryEnergyFlowFrameBuildResult;
}

/**
 * The I05 implementation is owned by the outer client boundary so its dynamic
 * import does not pull the application browser entry into the initial scene
 * closure.
 */
export type LazyScenarioComparisonInstrument =
  LazyExoticComponent<
    ComponentType<ScenarioComparisonInstrumentProps>
  >;

export type LazyBatteryEnergyFlowInstrument =
  LazyExoticComponent<
    ComponentType<BatteryEnergyFlowInstrumentProps>
  >;

/**
 * Imperative boundary used by the one Observatory scene coordinator.
 * Instrument components never own a frame loop or request rendering.
 */
export interface ObservatoryInstrumentPresentationHandle {
  applyPresentation(
    presentation: ObservatoryInstrumentPresentationState,
  ): void;
}

export interface ObservatoryInstrumentViewMap {
  readonly "solar-digital-twin": SolarDigitalTwinViewResult;
  readonly "atmospheric-observation": AtmosphericObservationViewResult;
  readonly "annual-energy-observatory": AnnualEnergyViewResult;
  readonly "solar-array-engineering": ArrayEngineeringViewResult;
  readonly "scenario-comparison": ScenarioComparisonFrameBuildResult;
  readonly "battery-energy-flow": BatteryEnergyFlowFrameBuildResult;
}

export type ObservatoryInstrumentViews = Readonly<
  Partial<ObservatoryInstrumentViewMap>
>;

export type ObservatoryInstrumentPresentations = Readonly<
  Partial<
    Record<
      ObservatoryInstrumentKey,
      ObservatoryInstrumentPresentationState
    >
  >
>;

/**
 * One frame-facing handle coordinates dial rotation and every mounted
 * instrument. Adding an instrument never adds another scene-frame owner.
 */
export interface ObservatoryInstrumentManagerHandle {
  applyPresentation(
    dialRotationRad: number,
    presentations: readonly ObservatoryInstrumentPresentationState[],
  ): void;
}
