"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Color, InstancedMesh, Object3D } from "three";
import {
  PARTICLE_BUDGET_BY_QUALITY,
  type VisualQualityTier,
} from "@/features/visual-computing/renderer-policy";
import {
  selectSemanticParticles,
  type SemanticParticleV1,
} from "./particle-model";

export interface ParticleSystemProps {
  readonly particles?: readonly SemanticParticleV1[];
  readonly qualityTier?: VisualQualityTier;
  readonly radius?: number;
  readonly visible?: boolean;
}

export function ParticleSystem({
  particles = [],
  qualityTier = "balanced",
  radius = 0.018,
  visible = true,
}: ParticleSystemProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const helper = useMemo(() => new Object3D(), []);
  const colour = useMemo(() => new Color(), []);
  const { invalidate } = useThree();
  const capacity = PARTICLE_BUDGET_BY_QUALITY[qualityTier];
  const selected = useMemo(
    () => selectSemanticParticles(particles, capacity),
    [capacity, particles],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    selected.forEach((particle, index) => {
      const scale = Number.isFinite(particle.scale)
        ? Math.max(0.25, Math.min(4, particle.scale ?? 1))
        : 1;
      helper.position.set(...particle.position);
      helper.scale.setScalar(scale);
      helper.updateMatrix();
      mesh.setMatrixAt(index, helper.matrix);
      colour.set(particle.colour ?? "#e7c46a");
      mesh.setColorAt(index, colour);
    });
    mesh.count = selected.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [colour, helper, invalidate, selected]);

  if (!visible || selected.length === 0) return null;
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, capacity]}
      frustumCulled
      name="semantic-particle-system"
    >
      <sphereGeometry args={[Math.max(0.001, radius), 8, 6]} />
      <meshBasicMaterial
        color="#ffffff"
        toneMapped={false}
        transparent
        opacity={0.82}
      />
    </instancedMesh>
  );
}
