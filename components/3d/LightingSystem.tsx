import type { VisualQualityTier } from "@/features/visual-computing/renderer-policy";

export type LightingMode = "solar" | "analysis" | "mission";

export interface LightingSystemProps {
  readonly mode?: LightingMode;
  readonly qualityTier?: VisualQualityTier;
  readonly enableShadows?: boolean;
  readonly softening?: number;
}

const LIGHTING = {
  solar: {
    ambient: "#b8aa8c",
    key: "#fff0c4",
    fill: "#5f756e",
  },
  analysis: {
    ambient: "#aeb9ba",
    key: "#edf7f6",
    fill: "#607786",
  },
  mission: {
    ambient: "#b8b6ae",
    key: "#fff7df",
    fill: "#66827d",
  },
} as const;

export function LightingSystem({
  mode = "solar",
  qualityTier = "balanced",
  enableShadows = false,
  softening = 0,
}: LightingSystemProps) {
  const palette = LIGHTING[mode];
  const safeSoftening = Number.isFinite(softening)
    ? Math.max(0, Math.min(1, softening))
    : 0;
  const shadowMapSize =
    qualityTier === "cinematic" ? 2048 : qualityTier === "balanced" ? 1024 : 512;
  return (
    <group
      name="helios-lighting-system"
      userData={{ mode, softening: safeSoftening }}
    >
      <ambientLight
        color={palette.ambient}
        intensity={0.34 + safeSoftening * 0.04}
      />
      <hemisphereLight
        color={palette.key}
        groundColor={palette.fill}
        intensity={0.48 + safeSoftening * 0.02}
      />
      <directionalLight
        color={palette.key}
        intensity={1.35 - safeSoftening * 0.3}
        position={[4, 5, 6]}
        castShadow={enableShadows}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
      />
    </group>
  );
}
