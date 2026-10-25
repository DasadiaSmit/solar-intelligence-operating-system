import {
  type Group,
  type ShaderMaterial,
  Vector3,
} from "three";
import {
  HELIOS_RING_SPECS,
  type HeliosHeroVisualState,
} from "@/features/visual-computing/helios-hero-model";
import {
  coreRingApertureScale,
} from "@/features/visual-computing/hero-motion";

const TAU = Math.PI * 2;

export function updateHeliosSurfaceUniforms(
  material: ShaderMaterial | null,
  visual: HeliosHeroVisualState,
  elapsedSeconds: number,
): void {
  if (!material) return;
  material.uniforms.uTime.value = elapsedSeconds;
  material.uniforms.uIrradiance.value = visual.irradianceRatio;
  material.uniforms.uCloudFraction.value = visual.cloudFraction;
  material.uniforms.uQualityScore.value = visual.qualityScore;
  material.uniforms.uSolarElevation.value =
    visual.solarElevationRatio;
  (
    material.uniforms.uSunDirection.value as Vector3
  ).set(...visual.sunDirectionThree);
}

export function updateHeliosCoronaUniforms(
  material: ShaderMaterial | null,
  visual: HeliosHeroVisualState,
  elapsedSeconds: number,
): void {
  if (!material) return;
  material.uniforms.uTime.value = elapsedSeconds;
  material.uniforms.uIrradiance.value = visual.irradianceRatio;
  material.uniforms.uCloudFraction.value = visual.cloudFraction;
  material.uniforms.uQualityScore.value = visual.qualityScore;
}

export function updateHeliosCoreRings(
  core: Group | null,
  heroProgress: number,
  elapsedSeconds: number,
): void {
  if (!core) return;
  for (let index = 0; index < HELIOS_RING_SPECS.length; index += 1) {
    const ring = HELIOS_RING_SPECS[index];
    if (!ring) continue;
    const ringGroup = core.getObjectByName(`helios-ring:${ring.id}`);
    if (!ringGroup) continue;
    const phase =
      (elapsedSeconds * TAU * ring.direction) / ring.periodSeconds;
    ringGroup.rotation.set(
      ring.inclination[0]
        + heroProgress * (index % 2 === 0 ? 0.12 : -0.12),
      ring.inclination[1] + phase,
      ring.inclination[2] + heroProgress * (index - 2.5) * 0.035,
    );
    ringGroup.scale.setScalar(
      coreRingApertureScale(index, heroProgress),
    );
  }
}
