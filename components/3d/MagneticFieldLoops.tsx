"use client";

import { forwardRef } from "react";
import { Line } from "@react-three/drei";
import {
  CubicBezierCurve3,
  Vector3,
  type Group,
} from "three";

interface MagneticLoopSpec {
  readonly id: string;
  readonly start: readonly [number, number, number];
  readonly controlA: readonly [number, number, number];
  readonly controlB: readonly [number, number, number];
  readonly end: readonly [number, number, number];
  readonly opacity: number;
}

const MAGNETIC_LOOP_SPECS: readonly MagneticLoopSpec[] = Object.freeze([
  {
    id: "north-inner",
    start: [-0.62, 0.64, 0.02],
    controlA: [-1.06, 1.38, 0.18],
    controlB: [1.06, 1.38, 0.18],
    end: [0.62, 0.64, 0.02],
    opacity: 0.27,
  },
  {
    id: "north-outer",
    start: [-0.48, 0.78, -0.14],
    controlA: [-1.68, 2.18, -0.42],
    controlB: [1.68, 2.18, -0.42],
    end: [0.48, 0.78, -0.14],
    opacity: 0.19,
  },
  {
    id: "south-inner",
    start: [-0.62, -0.64, -0.02],
    controlA: [-1.06, -1.38, -0.18],
    controlB: [1.06, -1.38, -0.18],
    end: [0.62, -0.64, -0.02],
    opacity: 0.25,
  },
  {
    id: "south-outer",
    start: [-0.48, -0.78, 0.14],
    controlA: [-1.68, -2.18, 0.42],
    controlB: [1.68, -2.18, 0.42],
    end: [0.48, -0.78, 0.14],
    opacity: 0.17,
  },
  {
    id: "east-arc",
    start: [0.72, -0.45, 0.12],
    controlA: [1.62, -1.02, 0.44],
    controlB: [1.62, 1.02, 0.44],
    end: [0.72, 0.45, 0.12],
    opacity: 0.16,
  },
  {
    id: "west-arc",
    start: [-0.72, -0.45, -0.12],
    controlA: [-1.62, -1.02, -0.44],
    controlB: [-1.62, 1.02, -0.44],
    end: [-0.72, 0.45, -0.12],
    opacity: 0.16,
  },
]);

function vector(
  value: readonly [number, number, number],
): Vector3 {
  return new Vector3(value[0], value[1], value[2]);
}

const MAGNETIC_LOOP_POINTS = MAGNETIC_LOOP_SPECS.map((spec) =>
  new CubicBezierCurve3(
    vector(spec.start),
    vector(spec.controlA),
    vector(spec.controlB),
    vector(spec.end),
  ).getPoints(48),
);

export interface MagneticFieldLoopsProps {
  readonly visibleCount?: number;
}

/**
 * Deliberately schematic magnetic-field guides. They communicate field
 * topology without implying that a magnetogram is available in SceneFrameV1.
 */
export const MagneticFieldLoops = forwardRef<
  Group,
  MagneticFieldLoopsProps
>(function MagneticFieldLoops(
  { visibleCount = MAGNETIC_LOOP_SPECS.length },
  ref,
) {
  const clampedVisibleCount = Math.max(
    0,
    Math.min(MAGNETIC_LOOP_SPECS.length, visibleCount),
  );

  return (
    <group
      ref={ref}
      name="magnetic-field-guides"
      userData={{ representation: "schematic-not-measured" }}
    >
      {MAGNETIC_LOOP_SPECS.slice(0, clampedVisibleCount).map(
        (spec, index) => (
          <Line
            key={spec.id}
            name={`magnetic-field-guide:${spec.id}`}
            points={MAGNETIC_LOOP_POINTS[index]}
            color="#d9bd79"
            depthWrite={false}
            lineWidth={0.72}
            opacity={spec.opacity}
            renderOrder={30 + index}
            toneMapped={false}
            transparent
            userData={{ representation: "schematic-not-measured" }}
          />
        ),
      )}
    </group>
  );
});
