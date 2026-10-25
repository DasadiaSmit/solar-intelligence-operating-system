import type { Vector3Tuple } from "./types";

export type ParticleSemantic = "photon" | "energy" | "data";

export interface SemanticParticleV1 {
  readonly id: string;
  readonly semantic: ParticleSemantic;
  readonly position: Vector3Tuple;
  readonly scale?: number;
  readonly colour?: string;
}

function isValidParticle(particle: SemanticParticleV1): boolean {
  return Boolean(particle.id)
    && particle.position.every(Number.isFinite)
    && (particle.scale === undefined || Number.isFinite(particle.scale));
}

export function selectSemanticParticles(
  particles: readonly SemanticParticleV1[],
  budget: number,
): readonly SemanticParticleV1[] {
  const safeBudget = Number.isFinite(budget)
    ? Math.max(0, Math.trunc(budget))
    : 0;
  const seenIds = new Set<string>();
  return particles
    .filter((particle) => {
      if (!isValidParticle(particle) || seenIds.has(particle.id)) {
        return false;
      }
      seenIds.add(particle.id);
      return true;
    })
    .slice(0, safeBudget);
}
