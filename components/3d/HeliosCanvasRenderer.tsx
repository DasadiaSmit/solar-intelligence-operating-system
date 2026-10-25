"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  Canvas,
  useThree,
  type RootState,
} from "@react-three/fiber";
import {
  ACESFilmicToneMapping,
  SRGBColorSpace,
} from "three";
import type { HeliosRendererPolicy } from "@/features/visual-computing/renderer-policy";
import { HeliosCamera } from "./HeliosCamera";
import { HeliosRendererPolicyProvider } from "./HeliosRendererPolicyContext";
import {
  sanitizeHeliosCameraConfiguration,
  type HeliosCameraConfiguration,
} from "./types";

export interface HeliosCanvasRendererProps {
  readonly children: ReactNode;
  readonly policy: HeliosRendererPolicy;
  readonly camera?: HeliosCameraConfiguration;
  readonly onContextLost: () => void;
  readonly onReady?: () => void;
}

interface RendererLifecycleProps {
  readonly onContextLost: () => void;
  readonly onReady?: () => void;
}

function RendererLifecycle({
  onContextLost,
  onReady,
}: RendererLifecycleProps) {
  const renderer = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const readyReported = useRef(false);

  useEffect(() => {
    const canvas = renderer.domElement;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };
    canvas.addEventListener("webglcontextlost", handleContextLost);
    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
    };
  }, [onContextLost, renderer]);

  useEffect(() => {
    if (!onReady || readyReported.current) return;

    let cancelled = false;
    let animationFrame = 0;
    const reportAfterRender = () => {
      if (cancelled || readyReported.current) return;
      if (renderer.info.render.frame > 0) {
        readyReported.current = true;
        onReady();
        return;
      }
      animationFrame = window.requestAnimationFrame(reportAfterRender);
    };

    invalidate();
    animationFrame = window.requestAnimationFrame(reportAfterRender);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
    };
  }, [invalidate, onReady, renderer]);

  return null;
}

export default function HeliosCanvasRenderer({
  children,
  policy,
  camera,
  onContextLost,
  onReady,
}: HeliosCanvasRendererProps) {
  const safeCamera = useMemo(
    () => sanitizeHeliosCameraConfiguration(camera),
    [camera],
  );

  const handleCreated = (state: RootState) => {
    const context = state.gl.getContext();
    if (
      typeof WebGL2RenderingContext === "undefined"
      || !(context instanceof WebGL2RenderingContext)
    ) {
      throw new Error("The Helios renderer requires WebGL 2.");
    }
    const canvas = state.gl.domElement;
    canvas.tabIndex = -1;
    canvas.setAttribute("aria-hidden", "true");
    state.gl.setClearAlpha(0);
    state.gl.toneMapping = ACESFilmicToneMapping;
    state.gl.outputColorSpace = SRGBColorSpace;
  };

  return (
    <Canvas
      aria-hidden="true"
      role="presentation"
      tabIndex={-1}
      frameloop={policy.frameloop}
      dpr={policy.dpr}
      camera={{
        position: [...safeCamera.position],
        fov: safeCamera.fovDeg,
        near: safeCamera.near,
        far: safeCamera.far,
      }}
      gl={{
        alpha: true,
        antialias: policy.antialias,
        powerPreference:
          policy.qualityTier === "cinematic" ? "high-performance" : "low-power",
      }}
      performance={{ min: 0.5, max: 1, debounce: 240 }}
      shadows={false}
      onCreated={handleCreated}
      style={{ pointerEvents: "none" }}
    >
      <HeliosRendererPolicyProvider policy={policy}>
        <RendererLifecycle
          onContextLost={onContextLost}
          onReady={onReady}
        />
        <HeliosCamera configuration={safeCamera} />
        {children}
      </HeliosRendererPolicyProvider>
    </Canvas>
  );
}
