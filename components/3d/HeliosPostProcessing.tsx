"use client";

import {
  Bloom,
  EffectComposer,
  N8AO,
  Vignette,
} from "@react-three/postprocessing";
import type { VisualQualityTier } from "@/features/visual-computing/renderer-policy";

export interface HeliosPostProcessingProps {
  readonly qualityTier: VisualQualityTier;
}

const restrainedBloom = (
  <Bloom
    intensity={0.26}
    luminanceThreshold={0.72}
    luminanceSmoothing={0.2}
    mipmapBlur
  />
);

const restrainedVignette = (
  <Vignette
    eskil={false}
    offset={0.34}
    darkness={0.22}
  />
);

export function HeliosPostProcessing({
  qualityTier,
}: HeliosPostProcessingProps) {
  if (qualityTier === "scientific") return null;

  if (qualityTier === "balanced") {
    return (
      <EffectComposer
        multisampling={0}
        resolutionScale={0.68}
      >
        {restrainedBloom}
        {restrainedVignette}
      </EffectComposer>
    );
  }

  return (
    <EffectComposer
      multisampling={2}
      resolutionScale={0.8}
    >
      <N8AO
        aoRadius={1.2}
        distanceFalloff={0.8}
        intensity={0.38}
        quality="low"
        halfRes
        depthAwareUpsampling
      />
      {restrainedBloom}
      {restrainedVignette}
    </EffectComposer>
  );
}
