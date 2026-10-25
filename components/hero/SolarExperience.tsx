"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  ApplicationActivationInput,
  ApplicationActivationRequest,
} from "@/features/application-activation";
import styles from "./HeliosHero.module.css";

export type SolarExperiencePhase =
  | "hero"
  | "observatory"
  | "application";

interface SolarExperienceContextValue {
  readonly phase: SolarExperiencePhase;
  readonly heroComplete: boolean;
  readonly activationRequest: ApplicationActivationRequest | null;
  readonly linkedSelectedIndex: number | null;
  readonly setLinkedSelectedIndex: (index: number) => void;
  readonly returnToObservatory: () => void;
  readonly completeHero: () => void;
  readonly setIntroPhase: (
    phase: Exclude<SolarExperiencePhase, "application">,
  ) => void;
  readonly activateApplication: (
    activation?: ApplicationActivationInput,
  ) => void;
  readonly acknowledgeApplicationActivation: (
    request: ApplicationActivationRequest,
  ) => void;
}

const SolarExperienceContext =
  createContext<SolarExperienceContextValue | null>(null);

export interface SolarExperienceProps {
  readonly hero: ReactNode;
  readonly application: ReactNode;
}

export function SolarExperience({
  hero,
  application,
}: SolarExperienceProps) {
  const [phase, setPhase] = useState<SolarExperiencePhase>("hero");
  const observatoryRef = useRef<HTMLDivElement>(null);
  const applicationRef = useRef<HTMLDivElement>(null);
  const focusApplicationRef = useRef(false);
  const focusObservatoryRef = useRef(false);
  const [linkedSelectedIndex, setLinkedIndex] = useState<number | null>(null);
  const [activationRequest, setActivationRequest] =
    useState<ApplicationActivationRequest | null>(null);
  const [acknowledgedActivation, setAcknowledgedActivation] =
    useState<ApplicationActivationRequest | null>(null);
  const heroComplete = phase === "application";

  const setLinkedSelectedIndex = useCallback((index: number) => {
    if (Number.isFinite(index)) setLinkedIndex(Math.max(0, Math.trunc(index)));
  }, []);

  const returnToObservatory = useCallback(() => {
    focusApplicationRef.current = false;
    focusObservatoryRef.current = true;
    setActivationRequest(null);
    setAcknowledgedActivation(null);
    setPhase("hero");
  }, []);

  const setIntroPhase = useCallback(
    (nextPhase: Exclude<SolarExperiencePhase, "application">) => {
      setPhase((current) =>
        current === "application" ? current : nextPhase,
      );
    },
    [],
  );

  const activateApplication = useCallback((
    activation: ApplicationActivationInput = false,
  ) => {
    const targetedRequest =
      typeof activation === "boolean" ? null : activation;
    const requestFocus =
      typeof activation === "boolean"
        ? activation
        : activation.requestFocus;
    const focusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setActivationRequest(targetedRequest);
    setAcknowledgedActivation(null);
    focusObservatoryRef.current = false;
    if (targetedRequest) {
      setLinkedSelectedIndex(targetedRequest.target.selectedIndex);
    }
    focusApplicationRef.current =
      requestFocus
      || Boolean(
        focusedElement
        && observatoryRef.current?.contains(focusedElement),
      );
    setPhase("application");
  }, [setLinkedSelectedIndex]);

  const acknowledgeApplicationActivation = useCallback(
    (request: ApplicationActivationRequest) => {
      setAcknowledgedActivation(request);
    },
    [],
  );

  const completeHero = useCallback(() => {
    activateApplication(true);
  }, [activateApplication]);

  const context = useMemo(
    () => ({
      phase,
      heroComplete,
      activationRequest,
      linkedSelectedIndex,
      setLinkedSelectedIndex,
      returnToObservatory,
      completeHero,
      setIntroPhase,
      activateApplication,
      acknowledgeApplicationActivation,
    }),
    [
      acknowledgeApplicationActivation,
      activateApplication,
      activationRequest,
      completeHero,
      heroComplete,
      linkedSelectedIndex,
      phase,
      returnToObservatory,
      setLinkedSelectedIndex,
      setIntroPhase,
    ],
  );

  useEffect(() => {
    if (!heroComplete) return;
    if (!focusApplicationRef.current) return;
    if (
      activationRequest
      && acknowledgedActivation !== activationRequest
    ) {
      return;
    }
    focusApplicationRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      const requestedFocusId =
        activationRequest?.intent?.focusTargetId;
      const requestedTarget = requestedFocusId
        ? applicationRef.current?.querySelector<HTMLElement>(
            `#${requestedFocusId}`,
          )
        : null;
      const focusTarget =
        requestedTarget
        ?? applicationRef.current
          ?.querySelector<HTMLElement>("#primary-stage");
      focusTarget?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    acknowledgedActivation,
    activationRequest,
    heroComplete,
  ]);

  useEffect(() => {
    if (heroComplete || !focusObservatoryRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      focusObservatoryRef.current = false;
      observatoryRef.current
        ?.querySelector<HTMLElement>("[data-sunlit-return-focus]")
        ?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [heroComplete]);

  return (
    <SolarExperienceContext.Provider value={context}>
      <div
        className={styles.experience}
        data-solar-experience-phase={phase}
        data-helios-intro-active={heroComplete ? "false" : "true"}
        data-observatory-active={phase === "observatory" ? "true" : "false"}
      >
        <div
          ref={observatoryRef}
          className={styles.observatoryShell}
          inert={heroComplete}
          aria-hidden={heroComplete}
          data-experience-state={heroComplete ? "inactive" : "active"}
        >
          {hero}
        </div>
        <div
          ref={applicationRef}
          className={styles.applicationShell}
          inert={!heroComplete}
          aria-hidden={!heroComplete}
          data-sios-application-active={
            heroComplete ? "true" : "false"
          }
          data-experience-state={heroComplete ? "active" : "inert"}
        >
          {application}
        </div>
      </div>
    </SolarExperienceContext.Provider>
  );
}

export function useSolarExperience(): SolarExperienceContextValue {
  const context = useContext(SolarExperienceContext);
  if (!context) {
    throw new Error(
      "useSolarExperience must be used within a SolarExperience.",
    );
  }
  return context;
}

export function useOptionalSolarExperience():
  SolarExperienceContextValue | null {
  return useContext(SolarExperienceContext);
}
