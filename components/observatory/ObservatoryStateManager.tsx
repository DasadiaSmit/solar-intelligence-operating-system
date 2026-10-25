"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  OBSERVATORY_ACTIVE_POSITION_COUNT,
  type ObservatoryPresentationState,
} from "@/features/visual-computing/observatory-model";
import type { ApplicationActivationInput } from "@/features/application-activation";

export interface ObservatoryStateManagerValue {
  readonly state: ObservatoryPresentationState;
  readonly reducedMotion: boolean;
  readonly navigationSettled: boolean;
  readonly navigateToPosition: (index: number) => void;
  readonly linkedSelectedIndex: number;
  readonly enterApplication: (
    activation?: ApplicationActivationInput,
  ) => void;
}

export interface ObservatoryStateManagerProps
  extends ObservatoryStateManagerValue {
  readonly children: ReactNode;
}

const ObservatoryStateContext =
  createContext<ObservatoryStateManagerValue | null>(null);

export function ObservatoryStateManager({
  children,
  state,
  reducedMotion,
  navigationSettled,
  navigateToPosition,
  linkedSelectedIndex,
  enterApplication,
}: ObservatoryStateManagerProps) {
  const navigateToActivePosition = useCallback(
    (index: number) => {
      if (
        !Number.isInteger(index)
        || index < 0
        || index >= OBSERVATORY_ACTIVE_POSITION_COUNT
      ) {
        return;
      }
      navigateToPosition(index);
    },
    [navigateToPosition],
  );
  const enterExistingApplication = useCallback(
    (activation: ApplicationActivationInput = false) => {
      enterApplication(activation);
    },
    [enterApplication],
  );
  const value = useMemo<ObservatoryStateManagerValue>(
    () => ({
      state,
      reducedMotion,
      navigationSettled,
      linkedSelectedIndex,
      navigateToPosition: navigateToActivePosition,
      enterApplication: enterExistingApplication,
    }),
    [
      enterExistingApplication,
      navigateToActivePosition,
      navigationSettled,
      linkedSelectedIndex,
      reducedMotion,
      state,
    ],
  );

  return (
    <ObservatoryStateContext.Provider value={value}>
      {children}
    </ObservatoryStateContext.Provider>
  );
}

export function useObservatoryStateManager(): ObservatoryStateManagerValue {
  const value = useContext(ObservatoryStateContext);
  if (!value) {
    throw new Error(
      "useObservatoryStateManager must be used within ObservatoryStateManager.",
    );
  }
  return value;
}
