"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  OBSERVATORY_HANDOFF_START,
  deriveObservatoryPresentationState,
  progressForObservatoryPosition,
  type ObservatoryPresentationState,
} from "@/features/visual-computing/observatory-model";

const COMPLETION_THRESHOLD = 0.999;
const PROGRESS_EPSILON = 0.0005;
const SCROLL_SETTLED_DELAY_MS = 240;

export interface ObservatoryScrollEngine {
  readonly scrollRef: RefObject<HTMLDivElement | null>;
  readonly state: ObservatoryPresentationState;
  readonly navigationSettled: boolean;
  readonly navigateToPosition: (positionIndex: number) => boolean;
}

export interface UseObservatoryScrollEngineOptions {
  readonly reducedMotion: boolean;
  readonly onComplete: (requestFocus?: boolean) => void;
}

function normalizedScrollProgress(element: HTMLDivElement): number {
  const maximum = element.scrollHeight - element.clientHeight;
  if (!Number.isFinite(maximum) || maximum <= 0) return 0;
  const candidate = element.scrollTop / maximum;
  if (!Number.isFinite(candidate)) return 0;
  return Math.max(0, Math.min(1, candidate));
}

/** Keep a quantized native-scroll destination inside its requested phase. */
export function observatoryScrollTarget(
  progress: number,
  maximum: number,
): number | null {
  if (
    !Number.isFinite(progress) || progress < 0 || progress > 1
    || !Number.isFinite(maximum) || maximum <= 0
  ) return null;
  const pixels = progress * maximum;
  // Entry belongs to Observatory; its final stop precedes the handoff.
  const target = progress === OBSERVATORY_HANDOFF_START
    ? Math.floor(pixels)
    : Math.ceil(pixels);
  return Math.max(0, Math.min(maximum, target));
}

export function observatoryStateForScroll(
  current: ObservatoryPresentationState,
  progress: number,
): ObservatoryPresentationState {
  const next = deriveObservatoryPresentationState(progress);
  return Math.abs(current.progress - next.progress) >= PROGRESS_EPSILON
    || current.phase !== next.phase
    || current.activePositionIndex !== next.activePositionIndex
    ? next
    : current;
}

export function useObservatoryScrollEngine({
  reducedMotion,
  onComplete,
}: UseObservatoryScrollEngineOptions): ObservatoryScrollEngine {
  const scrollRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const [navigationSettled, setNavigationSettled] = useState(true);
  const [state, setState] = useState<ObservatoryPresentationState>(
    () => deriveObservatoryPresentationState(0),
  );

  useEffect(() => {
    if (reducedMotion) return;
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    let animationFrame = 0;
    let settledTimer = window.setTimeout(() => {
      setNavigationSettled(true);
    }, 0);

    const update = () => {
      animationFrame = 0;
      const progress = normalizedScrollProgress(scrollContainer);
      setState((current) =>
        observatoryStateForScroll(current, progress),
      );
      if (
        progress >= COMPLETION_THRESHOLD
        && !completedRef.current
      ) {
        completedRef.current = true;
        onComplete(false);
      }
    };

    const scheduleUpdate = () => {
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(update);
      }
    };
    const handleScroll = () => {
      setNavigationSettled(false);
      window.clearTimeout(settledTimer);
      settledTimer = window.setTimeout(() => {
        setNavigationSettled(true);
      }, SCROLL_SETTLED_DELAY_MS);
      scheduleUpdate();
    };

    scrollContainer.addEventListener("scroll", handleScroll, {
      passive: true,
    });
    window.addEventListener("resize", scheduleUpdate, {
      passive: true,
    });
    scheduleUpdate();
    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", scheduleUpdate);
      window.clearTimeout(settledTimer);
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [onComplete, reducedMotion]);

  const navigateToPosition = useCallback(
    (positionIndex: number) => {
      const targetProgress =
        progressForObservatoryPosition(positionIndex);
      if (targetProgress === null) return false;
      if (reducedMotion) {
        setState(deriveObservatoryPresentationState(targetProgress));
        setNavigationSettled(true);
        return true;
      }
      const scrollContainer = scrollRef.current;
      if (!scrollContainer) return false;
      const maximum =
        scrollContainer.scrollHeight - scrollContainer.clientHeight;
      const targetTop = observatoryScrollTarget(targetProgress, maximum);
      if (targetTop === null) return false;
      scrollContainer.scrollTo({
        top: targetTop,
        behavior: reducedMotion ? "auto" : "smooth",
      });
      return true;
    },
    [reducedMotion],
  );

  return {
    scrollRef,
    state,
    navigationSettled: reducedMotion || navigationSettled,
    navigateToPosition,
  };
}
