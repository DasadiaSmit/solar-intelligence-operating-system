"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  InstancedMesh,
  Object3D,
} from "three";
import type {
  VisualQualityTier,
} from "@/features/visual-computing/renderer-policy";

type Point2 = readonly [x: number, y: number];

const MAX_CLOUD_CELLS = 7;
const CLOUD_CELL_POSITIONS: readonly Point2[] = Object.freeze([
  [-0.19, 0.055],
  [-0.125, 0.09],
  [-0.06, 0.05],
  [0, 0.085],
  [0.065, 0.045],
  [0.13, 0.085],
  [0.195, 0.05],
]);

export const ATMOSPHERIC_DISPLAY_LIMITS = Object.freeze({
  temperatureMinimumC: -90,
  temperatureMaximumC: 65,
  windSpeedMps: 110,
  ghiWm2: 1_500,
  dniWm2: 1_600,
  dhiWm2: 1_100,
  poaWm2: 1_600,
});

export function clampAtmosphericDisplayRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function atmosphericChannelRatio(
  value: number,
  maximum: number,
): number {
  return clampAtmosphericDisplayRatio(value / maximum);
}

export function CloudCoverageScreen({
  cloudCoverPct,
  qualityTier,
}: {
  readonly cloudCoverPct: number;
  readonly qualityTier: VisualQualityTier;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const transform = useMemo(() => new Object3D(), []);
  const coverage = clampAtmosphericDisplayRatio(cloudCoverPct / 100);
  const visibleCount =
    qualityTier === "scientific"
      ? 3
      : qualityTier === "balanced"
        ? 5
        : MAX_CLOUD_CELLS;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let index = 0; index < visibleCount; index += 1) {
      const sourceIndex = Math.round(
        index * (CLOUD_CELL_POSITIONS.length - 1)
        / (visibleCount - 1),
      );
      const position = CLOUD_CELL_POSITIONS[sourceIndex] ?? [0, 0];
      const alternatingScale = index % 2 === 0 ? 1 : 0.78;
      transform.position.set(
        position[0] * (0.42 + coverage * 0.58),
        position[1],
        0.006 + (index % 3) * 0.006,
      );
      transform.scale.set(
        (0.045 + coverage * 0.04) * alternatingScale,
        0.026 + coverage * 0.018,
        0.018,
      );
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    }
    mesh.count = visibleCount;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [coverage, transform, visibleCount]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_CLOUD_CELLS]}
      frustumCulled
      name="atmospheric-observation-cloud-coverage-screen"
      visible={coverage > 0.001}
      userData={{
        cloudCoverPct,
        geometryClaim: "coverage-screen-glyph-not-observed-cloud-geometry",
      }}
    >
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial
        color="#aebbb7"
        depthWrite={false}
        emissive="#6f8580"
        emissiveIntensity={0.025}
        metalness={0.08}
        opacity={0.12 + coverage * 0.68}
        roughness={0.9}
        transparent
      />
    </instancedMesh>
  );
}

export function IrradiancePath({
  colour,
  end,
  maximum,
  name,
  start,
  unit,
  value,
}: {
  readonly colour: string;
  readonly end: Point2;
  readonly maximum: number;
  readonly name: string;
  readonly start: Point2;
  readonly unit: string;
  readonly value: number;
}) {
  const ratio = atmosphericChannelRatio(value, maximum);
  const deltaX = end[0] - start[0];
  const deltaY = end[1] - start[1];
  const length = Math.hypot(deltaX, deltaY);

  return (
    <mesh
      name={name}
      position={[
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2,
        0.025,
      ]}
      rotation={[0, 0, Math.atan2(deltaY, deltaX)]}
      visible={ratio > 0.001}
      userData={{
        displayMaximum: maximum,
        exactValue: value,
        unit,
      }}
    >
      <boxGeometry args={[length, 0.006 + ratio * 0.02, 0.009]} />
      <meshBasicMaterial
        color={colour}
        depthWrite={false}
        opacity={0.08 + ratio * 0.72}
        toneMapped={false}
        transparent
      />
    </mesh>
  );
}
