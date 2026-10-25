"use client";

import { useEffect, useMemo, useState } from "react";
import {
  resolveHeliosRendererPolicy,
  type HeliosRendererEnvironment,
  type HeliosRendererFailureReason,
  type HeliosRendererPolicy,
} from "@/features/visual-computing/renderer-policy";

const SERVER_ENVIRONMENT: HeliosRendererEnvironment = {
  webglAvailable: false,
  contextLost: false,
  rendererFailed: false,
  pageVisible: true,
  reducedMotion: false,
  forcedColors: false,
  viewportWidth: 0,
  devicePixelRatio: 1,
  lowPerformanceDevice: true,
};

function detectWebGl2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function useHeliosRendererPolicy(
  rendererFailure: HeliosRendererFailureReason | null = null,
): HeliosRendererPolicy {
  const [environment, setEnvironment] =
    useState<HeliosRendererEnvironment>(SERVER_ENVIRONMENT);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const forcedColors = window.matchMedia("(forced-colors: active)");
    const webglAvailable = detectWebGl2();
    const update = () => {
      setEnvironment({
        webglAvailable,
        contextLost: false,
        rendererFailed: false,
        pageVisible: document.visibilityState !== "hidden",
        reducedMotion: reducedMotion.matches,
        forcedColors: forcedColors.matches,
        viewportWidth: window.innerWidth,
        devicePixelRatio: window.devicePixelRatio,
        lowPerformanceDevice:
          typeof navigator.hardwareConcurrency === "number"
          && navigator.hardwareConcurrency <= 4,
      });
    };
    update();
    window.addEventListener("resize", update, { passive: true });
    document.addEventListener("visibilitychange", update);
    reducedMotion.addEventListener("change", update);
    forcedColors.addEventListener("change", update);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("visibilitychange", update);
      reducedMotion.removeEventListener("change", update);
      forcedColors.removeEventListener("change", update);
    };
  }, []);

  return useMemo(
    () =>
      resolveHeliosRendererPolicy({
        ...environment,
        contextLost: rendererFailure === "context-lost",
        rendererFailed: rendererFailure === "renderer-failed",
      }),
    [environment, rendererFailure],
  );
}
