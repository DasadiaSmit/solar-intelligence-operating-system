export interface HeliosRendererEnvironment {
  readonly webglAvailable: boolean;
  readonly contextLost: boolean;
  readonly rendererFailed: boolean;
  readonly pageVisible: boolean;
  readonly reducedMotion: boolean;
  readonly forcedColors: boolean;
  readonly viewportWidth: number;
  readonly devicePixelRatio: number;
  readonly lowPerformanceDevice: boolean;
}

export type VisualQualityTier = "scientific" | "balanced" | "cinematic";
export type HeliosRendererFailureReason =
  | "context-lost"
  | "renderer-failed";

export interface HeliosRendererPolicy {
  readonly mode: "webgl" | "fallback" | "suspended";
  readonly reason:
    | "available"
    | "page-hidden"
    | "forced-colors"
    | "context-lost"
    | "renderer-failed"
    | "webgl-unavailable";
  readonly dpr: number;
  readonly frameloop: "demand";
  readonly motion: "animated" | "reduced";
  readonly qualityTier: VisualQualityTier;
  readonly particleBudget: number;
  readonly antialias: boolean;
}

export const PARTICLE_BUDGET_BY_QUALITY: Readonly<
  Record<VisualQualityTier, number>
> = Object.freeze({
  scientific: 48,
  balanced: 128,
  cinematic: 256,
});

function qualityTierFor(
  environment: HeliosRendererEnvironment,
): VisualQualityTier {
  if (environment.lowPerformanceDevice) {
    return "scientific";
  }
  if (environment.viewportWidth <= 720) {
    return "scientific";
  }
  return environment.viewportWidth <= 1280 ? "balanced" : "cinematic";
}

export function resolveHeliosRendererPolicy(
  environment: HeliosRendererEnvironment,
): HeliosRendererPolicy {
  const motion: HeliosRendererPolicy["motion"] =
    environment.reducedMotion ? "reduced" : "animated";
  const qualityTier = qualityTierFor(environment);
  const common = {
    frameloop: "demand" as const,
    motion,
    qualityTier,
    particleBudget: environment.reducedMotion
      ? 0
      : PARTICLE_BUDGET_BY_QUALITY[qualityTier],
    antialias:
      qualityTier !== "scientific"
      && !environment.lowPerformanceDevice,
  };
  if (!environment.pageVisible) {
    return {
      mode: "suspended",
      reason: "page-hidden",
      dpr: 1,
      ...common,
    };
  }
  if (environment.forcedColors) {
    return {
      mode: "fallback",
      reason: "forced-colors",
      dpr: 1,
      ...common,
    };
  }
  if (environment.contextLost) {
    return {
      mode: "fallback",
      reason: "context-lost",
      dpr: 1,
      ...common,
    };
  }
  if (environment.rendererFailed) {
    return {
      mode: "fallback",
      reason: "renderer-failed",
      dpr: 1,
      ...common,
    };
  }
  if (!environment.webglAvailable) {
    return {
      mode: "fallback",
      reason: "webgl-unavailable",
      dpr: 1,
      ...common,
    };
  }

  const requestedDpr = Number.isFinite(environment.devicePixelRatio)
    ? Math.max(1, environment.devicePixelRatio)
    : 1;
  const qualityDprCap: Record<VisualQualityTier, number> = {
    scientific: 1,
    balanced: 1.25,
    cinematic: 1.5,
  };
  const deviceDprCap = environment.lowPerformanceDevice ? 1 : 2;
  return {
    mode: "webgl",
    reason: "available",
    dpr: Math.min(
      deviceDprCap,
      requestedDpr,
      qualityDprCap[qualityTier],
    ),
    ...common,
  };
}
