"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  MathUtils,
  ShaderMaterial,
  Vector3,
  type Group,
  type PerspectiveCamera,
} from "three";
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
import type {
  BatteryEnergyFlowFrameBuildResult,
} from "@/features/visual-computing/battery-energy-flow-frame";
import {
  deriveArrayEngineeringView,
} from "@/features/visual-computing/array-engineering-view";
import type {
  ScenarioComparisonFrameBuildResult,
} from "@/features/visual-computing/scenario-comparison-frame";
import {
  deriveAtmosphericObservationView,
} from "@/features/visual-computing/atmospheric-observation-view";
import {
  MAGNETIC_FIELD_PERIOD_SECONDS,
  SOLAR_SURFACE_PERIOD_SECONDS,
  clampPointer,
  deriveHeliosHeroVisualState,
} from "@/features/visual-computing/helios-hero-model";
import {
  deriveObservatoryInstrumentPresentationStates,
} from "@/features/visual-computing/observatory-instrument-presentation";
import {
  deriveObservatoryPresentationState,
  type ObservatoryPresentationState,
} from "@/features/visual-computing/observatory-model";
import type {
  SceneFrameBuildResult,
} from "@/features/visual-computing/scene-frame";
import {
  deriveSolarDigitalTwinView,
} from "@/features/visual-computing/solar-digital-twin-view";
import { EnvironmentSystem } from "./EnvironmentSystem";
import {
  updateHeliosCoreRings,
  updateHeliosCoronaUniforms,
  updateHeliosSurfaceUniforms,
} from "./HeliosFrameRuntime";
import { HeliosCore } from "./HeliosCore";
import { HeliosPostProcessing } from "./HeliosPostProcessing";
import { LightingSystem } from "./LightingSystem";
import { MagneticFieldLoops } from "./MagneticFieldLoops";
import {
  ObservatoryCameraController,
} from "./ObservatoryCameraController";
import { ObservatoryInstrumentManager } from "./ObservatoryInstrumentManager";
import type {
  LazyBatteryEnergyFlowInstrument,
  LazyScenarioComparisonInstrument,
  ObservatoryInstrumentManagerHandle,
  ObservatoryInstrumentPresentations,
} from "./instruments";
import { SolarBody } from "./SolarBody";
import { useHeliosScenePolicy } from "./HeliosRendererPolicyContext";

const TAU = Math.PI * 2;
const PROGRESS_SETTLED_EPSILON = 0.0001;

export interface ObservatorySceneManagerProps {
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
 * The sole frame coordinator for the Hero and Observatory. It preserves the
 * linked SceneFrameV1 as the scientific source while coordinating camera,
 * Helios Core, Sun, field loops, structural ring, and mounted instruments.
 */
export function ObservatorySceneManager({
  active,
  annualEnergy,
  arrayEngineering,
  atmosphericObservation,
  batteryEnergyFlow,
  batteryEnergyFlowInstrument,
  scenarioComparison,
  scenarioComparisonInstrument,
  scene,
  state: requestedPresentation,
}: ObservatorySceneManagerProps) {
  const policy = useHeliosScenePolicy();
  const visual = deriveHeliosHeroVisualState(
    scene,
    requestedPresentation.heroProgress,
  );
  const solarDigitalTwinView = useMemo(
    () => deriveSolarDigitalTwinView(scene),
    [scene],
  );
  const atmosphericObservationView = useMemo(
    () => deriveAtmosphericObservationView(atmosphericObservation),
    [atmosphericObservation],
  );
  const annualEnergyView = useMemo(
    () => deriveAnnualEnergyView(annualEnergy),
    [annualEnergy],
  );
  const arrayEngineeringView = useMemo(
    () => deriveArrayEngineeringView(arrayEngineering),
    [arrayEngineering],
  );
  const requestedInstrumentPresentations =
    useMemo<ObservatoryInstrumentPresentations>(() => {
      const presentations: {
        -readonly [Key in keyof ObservatoryInstrumentPresentations]?:
          ObservatoryInstrumentPresentations[Key];
      } = {};
      for (
        const presentation
        of deriveObservatoryInstrumentPresentationStates(
          requestedPresentation.dialPosition,
        )
      ) {
        const key = presentation.mount.instrumentKey;
        if (key) presentations[key] = presentation;
      }
      return Object.freeze(presentations);
    }, [requestedPresentation.dialPosition]);
  const elapsedSecondsRef = useRef(0);
  const renderedProgressRef = useRef(requestedPresentation.progress);
  const cameraControllerRef =
    useRef<ObservatoryCameraController | null>(null);
  const heliosAssemblyRef = useRef<Group>(null);
  const coreRef = useRef<Group>(null);
  const instrumentManagerRef =
    useRef<ObservatoryInstrumentManagerHandle>(null);
  const magneticFieldRef = useRef<Group>(null);
  const solarBodyRef = useRef<Group>(null);
  const surfaceMaterialRef = useRef<ShaderMaterial>(null);
  const coronaMaterialRef = useRef<ShaderMaterial>(null);
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const pointerCurrentRef = useRef({ x: 0, y: 0 });
  const lookAtTarget = useMemo(() => new Vector3(), []);
  const invalidate = useThree((frameState) => frameState.invalidate);

  useEffect(() => {
    invalidate();
  }, [active, invalidate, requestedPresentation.progress]);

  useLayoutEffect(() => {
    const controller = new ObservatoryCameraController();
    cameraControllerRef.current = controller;
    return () => {
      cameraControllerRef.current = null;
      controller.dispose();
    };
  }, []);

  useEffect(() => {
    if (!active || policy.motion === "reduced") {
      pointerTargetRef.current.x = 0;
      pointerTargetRef.current.y = 0;
      pointerCurrentRef.current.x = 0;
      pointerCurrentRef.current.y = 0;
      return;
    }

    const finePointer = window.matchMedia("(pointer: fine)");
    const handlePointerMove = (event: PointerEvent) => {
      if (!finePointer.matches || event.pointerType !== "mouse") return;
      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      pointerTargetRef.current.x = clampPointer(
        (event.clientX / width) * 2 - 1,
      );
      pointerTargetRef.current.y = clampPointer(
        1 - (event.clientY / height) * 2,
      );
      invalidate();
    };
    const resetPointer = () => {
      pointerTargetRef.current.x = 0;
      pointerTargetRef.current.y = 0;
      invalidate();
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("blur", resetPointer);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", resetPointer);
    };
  }, [active, invalidate, policy.motion]);

  useFrame((frameState, deltaSeconds) => {
    if (!active || !visual) return;

    const reducedMotion = policy.motion === "reduced";
    const targetProgress = requestedPresentation.progress;
    const renderedProgress = reducedMotion
      ? targetProgress
      : MathUtils.damp(
          renderedProgressRef.current,
          targetProgress,
          5.25,
          Math.min(deltaSeconds, 0.1),
        );
    renderedProgressRef.current =
      Math.abs(renderedProgress - targetProgress)
        <= PROGRESS_SETTLED_EPSILON
        ? targetProgress
        : renderedProgress;
    const presentation = deriveObservatoryPresentationState(
      renderedProgressRef.current,
    );

    if (!reducedMotion) {
      elapsedSecondsRef.current =
        (elapsedSecondsRef.current + Math.min(deltaSeconds, 0.1))
        % 3_600;
    } else {
      elapsedSecondsRef.current = 0;
    }
    const elapsedSeconds = elapsedSecondsRef.current;

    const pointerCurrent = pointerCurrentRef.current;
    const pointerTarget = pointerTargetRef.current;
    if (reducedMotion) {
      pointerCurrent.x = 0;
      pointerCurrent.y = 0;
    } else {
      pointerCurrent.x = MathUtils.damp(
        pointerCurrent.x,
        pointerTarget.x,
        4,
        deltaSeconds,
      );
      pointerCurrent.y = MathUtils.damp(
        pointerCurrent.y,
        pointerTarget.y,
        4,
        deltaSeconds,
      );
    }

    const cameraController = cameraControllerRef.current;
    if (cameraController) {
      cameraController.seek(presentation, reducedMotion);
      cameraController.apply(
        frameState.camera as PerspectiveCamera,
        lookAtTarget,
        pointerCurrent,
        presentation.visibility.hero,
      );
    }

    updateHeliosCoreRings(
      coreRef.current,
      presentation.heroProgress,
      elapsedSeconds,
    );

    instrumentManagerRef.current?.applyPresentation(
      presentation.dialRotationRad,
      deriveObservatoryInstrumentPresentationStates(
        presentation.dialPosition,
      ),
    );
    if (heliosAssemblyRef.current) {
      const observatoryScale =
        1 - presentation.visibility.observatory * 0.16;
      heliosAssemblyRef.current.scale.setScalar(observatoryScale);
    }
    if (solarBodyRef.current) {
      solarBodyRef.current.rotation.y =
        (elapsedSeconds * TAU) / SOLAR_SURFACE_PERIOD_SECONDS;
    }
    if (magneticFieldRef.current) {
      magneticFieldRef.current.rotation.set(
        0.08,
        (elapsedSeconds * TAU) / MAGNETIC_FIELD_PERIOD_SECONDS,
        -0.04,
      );
    }

    updateHeliosSurfaceUniforms(
      surfaceMaterialRef.current,
      visual,
      elapsedSeconds,
    );
    updateHeliosCoronaUniforms(
      coronaMaterialRef.current,
      visual,
      elapsedSeconds,
    );

    const progressInFlight =
      Math.abs(
        renderedProgressRef.current - targetProgress,
      ) > PROGRESS_SETTLED_EPSILON;
    const pointerInFlight =
      Math.abs(pointerCurrent.x - pointerTarget.x) > 0.0005
      || Math.abs(pointerCurrent.y - pointerTarget.y) > 0.0005;
    if (!reducedMotion && (progressInFlight || pointerInFlight)) {
      frameState.invalidate();
    }
  });

  if (!visual) return null;

  const magneticLoopCount =
    policy.qualityTier === "scientific" ? 4 : 6;

  return (
    <EnvironmentSystem fog={{ colour: "#07090b", near: 7.5, far: 16 }}>
      <LightingSystem
        mode="solar"
        qualityTier={policy.qualityTier}
        enableShadows={false}
        softening={Math.max(
          0,
          1 - Math.abs(requestedPresentation.dialPosition - 1),
        )}
      />
      <group
        name="helios-continuous-observatory"
        userData={{
          sceneFrameResultId: visual.frame.resultId,
          representation: "scientific-contextual-visualisation",
        }}
      >
        <group ref={heliosAssemblyRef} name="helios-core-assembly">
          <HeliosCore
            ref={coreRef}
            qualityTier={policy.qualityTier}
          />
          <MagneticFieldLoops
            ref={magneticFieldRef}
            visibleCount={magneticLoopCount}
          />
          <SolarBody
            ref={solarBodyRef}
            surfaceMaterialRef={surfaceMaterialRef}
            coronaMaterialRef={coronaMaterialRef}
            qualityTier={policy.qualityTier}
          />
        </group>
        <ObservatoryInstrumentManager
          ref={instrumentManagerRef}
          activePositionIndex={requestedPresentation.activePositionIndex}
          visibility={requestedPresentation.visibility.instrumentRing}
          qualityTier={policy.qualityTier}
          presentations={requestedInstrumentPresentations}
          batteryEnergyFlowInstrument={batteryEnergyFlowInstrument}
          scenarioComparisonInstrument={scenarioComparisonInstrument}
          views={{
            "solar-digital-twin": solarDigitalTwinView,
            "atmospheric-observation": atmosphericObservationView,
            "annual-energy-observatory": annualEnergyView,
            "solar-array-engineering": arrayEngineeringView,
            "scenario-comparison": scenarioComparison,
            "battery-energy-flow": batteryEnergyFlow,
          }}
        />
      </group>
      <HeliosPostProcessing qualityTier={policy.qualityTier} />
    </EnvironmentSystem>
  );
}
