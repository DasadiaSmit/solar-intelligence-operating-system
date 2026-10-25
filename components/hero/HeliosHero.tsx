"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { ObservatoryNavigation } from "@/components/observatory/ObservatoryNavigation";
import { ObservatoryReadout } from "@/components/observatory/ObservatoryReadout";
import { ObservatoryStateManager } from "@/components/observatory/ObservatoryStateManager";
import { useObservatoryScrollEngine } from "@/components/observatory/useObservatoryScrollEngine";
import type { ApplicationActivationInput } from "@/features/application-activation";
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
import { HERO_LINKED_HOUR_INDEX } from "@/features/visual-computing/build-hero-scene";
import type { SceneFrameBuildResult } from "@/features/visual-computing/scene-frame";
import { HeliosHeroEntry } from "./HeliosHeroEntry";
import { HeliosHeroVisual } from "./HeliosHeroVisual";
import { useSolarExperience } from "./SolarExperience";
import styles from "./HeliosHero.module.css";

export interface HeliosHeroProps {
  readonly annualEnergy: AnnualEnergyFrameBuildResult;
  readonly arrayEngineering: ArrayEngineeringFrameBuildResult;
  readonly atmosphericObservation:
    AtmosphericObservationFrameBuildResult;
  readonly batteryEnergyFlow: BatteryEnergyFlowFrameBuildResult;
  readonly scenarioComparison: ScenarioComparisonFrameBuildResult;
  readonly scene: SceneFrameBuildResult;
}

function subscribeToReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function reducedMotionSnapshot(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    reducedMotionSnapshot,
    () => false,
  );
}

export function HeliosHero({
  annualEnergy,
  arrayEngineering,
  atmosphericObservation,
  batteryEnergyFlow,
  scenarioComparison,
  scene,
}: HeliosHeroProps) {
  const {
    phase: experiencePhase,
    setIntroPhase,
    activateApplication,
  } = useSolarExperience();
  const reducedMotion = useReducedMotion();
  const entryLayerRef = useRef<HTMLDivElement>(null);
  const observatoryLayerRef = useRef<HTMLDivElement>(null);
  const pendingNavigationFocusRef = useRef(false);
  const previousPresentationPhaseRef = useRef("hero");

  const finishObservatory = useCallback(
    (activation: ApplicationActivationInput = false) => {
      activateApplication(activation);
    },
    [activateApplication],
  );
  const {
    scrollRef,
    state,
    navigationSettled,
    navigateToPosition,
  } = useObservatoryScrollEngine({
    reducedMotion,
    onComplete: finishObservatory,
  });
  const heroActive = state.phase === "hero";

  useEffect(() => {
    if (experiencePhase === "application") return;
    setIntroPhase(heroActive ? "hero" : "observatory");
  }, [experiencePhase, heroActive, setIntroPhase]);

  useEffect(() => {
    const previousPhase = previousPresentationPhaseRef.current;
    previousPresentationPhaseRef.current = state.phase;
    if (previousPhase === state.phase) return;

    const focusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (state.phase !== "hero") {
      const shouldFocusNavigation =
        pendingNavigationFocusRef.current
        || Boolean(
          focusedElement
          && entryLayerRef.current?.contains(focusedElement),
        );
      pendingNavigationFocusRef.current = false;
      if (!shouldFocusNavigation) return;
      const frame = window.requestAnimationFrame(() => {
        observatoryLayerRef.current
          ?.querySelector<HTMLElement>("[data-observatory-initial-focus]")
          ?.focus({ preventScroll: true });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    if (
      focusedElement
      && observatoryLayerRef.current?.contains(focusedElement)
    ) {
      scrollRef.current?.focus({ preventScroll: true });
    }
  }, [scrollRef, state.phase]);

  const beginObservation = useCallback(() => {
    pendingNavigationFocusRef.current = true;
    if (!navigateToPosition(0)) {
      pendingNavigationFocusRef.current = false;
      setIntroPhase("observatory");
    }
  }, [navigateToPosition, setIntroPhase]);

  return (
    <section
      className={styles.overlay}
      aria-labelledby="helios-hero-title"
      data-motion={reducedMotion ? "reduced" : "full"}
      data-observatory-phase={state.phase}
      data-experience-active={
        experiencePhase === "application" ? "false" : "true"
      }
    >
      <div
        ref={scrollRef}
        className={styles.scrollRegion}
        role="region"
        aria-label="Helios Observatory journey"
        tabIndex={0}
      >
        <div className={styles.journey}>
          <div
            className={styles.stage}
            data-observatory-phase={state.phase}
          >
            <HeliosHeroVisual
              annualEnergy={annualEnergy}
              arrayEngineering={arrayEngineering}
              atmosphericObservation={atmosphericObservation}
              batteryEnergyFlow={batteryEnergyFlow}
              scenarioComparison={scenarioComparison}
              scene={scene}
              state={state}
              active={experiencePhase !== "application"}
            />

            <div
              ref={entryLayerRef}
              className={styles.entryLayer}
              inert={!heroActive}
              aria-hidden={!heroActive}
            >
              <HeliosHeroEntry
                scene={scene}
                reducedMotion={reducedMotion}
                onBeginObservation={beginObservation}
              />
            </div>

            <div
              ref={observatoryLayerRef}
              className={styles.observatoryLayer}
              inert={heroActive}
              aria-hidden={heroActive}
            >
              <ObservatoryStateManager
                state={state}
                reducedMotion={reducedMotion}
                navigationSettled={navigationSettled}
                navigateToPosition={navigateToPosition}
                enterApplication={finishObservatory}
                linkedSelectedIndex={HERO_LINKED_HOUR_INDEX}
              >
                <ObservatoryNavigation />
                <ObservatoryReadout
                  annualEnergy={annualEnergy}
                  arrayEngineering={arrayEngineering}
                  atmosphericObservation={atmosphericObservation}
                  batteryEnergyFlow={batteryEnergyFlow}
                  scenarioComparison={scenarioComparison}
                  scene={scene}
                />
              </ObservatoryStateManager>
            </div>

            <div className={styles.progressRail} aria-hidden="true">
              <span
                style={{
                  transform: `scaleX(${Math.max(0.02, state.progress)})`,
                }}
              />
            </div>
            <p
              className={styles.progressLabel}
              aria-hidden="true"
            >
              {Math.round(state.progress * 100)}%
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
