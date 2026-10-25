"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useThree } from "@react-three/fiber";
import {
  Color,
  InstancedMesh,
  Object3D,
} from "three";
import {
  OBSERVATORY_ACTIVE_POSITION_COUNT,
  OBSERVATORY_POSITIONS,
  markerStateForObservatoryPosition,
  type ObservatoryMarkerState,
} from "@/features/visual-computing/observatory-model";
import type { VisualQualityTier } from "@/features/visual-computing/renderer-policy";

export const OBSERVATORY_INSTRUMENT_RING_RADIUS = 2.5;

const ACTIVE_POSITION_MAX_INDEX =
  OBSERVATORY_ACTIVE_POSITION_COUNT - 1;
const FIDUCIAL_CAPACITY = OBSERVATORY_POSITIONS.length;
const MARKER_COLOURS: Readonly<
  Record<ObservatoryMarkerState, string>
> = Object.freeze({
  current: "#e7c86f",
  previous: "#667a70",
  future: "#3b554d",
  reserved: "#222c28",
});

function clampActivePositionIndex(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(
    0,
    Math.min(ACTIVE_POSITION_MAX_INDEX, Math.trunc(value)),
  );
}

function clampVisibility(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function dialSegments(qualityTier: VisualQualityTier): {
  readonly radial: number;
  readonly tubular: number;
} {
  if (qualityTier === "scientific") {
    return { radial: 4, tubular: 96 };
  }
  if (qualityTier === "balanced") {
    return { radial: 6, tubular: 144 };
  }
  return { radial: 8, tubular: 192 };
}

export interface InstrumentRingStructureProps {
  readonly activePositionIndex?: number;
  readonly visibility?: number;
  readonly qualityTier?: VisualQualityTier;
}

/**
 * Structural navigation dial for the Observatory. The fiducials identify
 * future instrument positions only; they contain no instrument or scientific
 * geometry and accept no direct pointer input.
 */
export function InstrumentRingStructure({
  activePositionIndex = 0,
  visibility = 1,
  qualityTier = "balanced",
}: InstrumentRingStructureProps) {
  const markerMeshRef = useRef<InstancedMesh>(null);
  const transformHelper = useMemo(() => new Object3D(), []);
  const colourHelper = useMemo(() => new Color(), []);
  const invalidate = useThree((state) => state.invalidate);
  const safeActivePositionIndex =
    clampActivePositionIndex(activePositionIndex);
  const safeVisibility = clampVisibility(visibility);
  const segments = dialSegments(qualityTier);

  useLayoutEffect(() => {
    const markerMesh = markerMeshRef.current;
    if (!markerMesh) return;

    for (const position of OBSERVATORY_POSITIONS) {
      const angle = position.angleRadians;
      transformHelper.position.set(
        Math.cos(angle) * OBSERVATORY_INSTRUMENT_RING_RADIUS,
        Math.sin(angle) * OBSERVATORY_INSTRUMENT_RING_RADIUS,
        0,
      );
      transformHelper.rotation.set(0, 0, angle - Math.PI / 2);
      transformHelper.scale.setScalar(1);
      transformHelper.updateMatrix();
      markerMesh.setMatrixAt(position.index, transformHelper.matrix);
    }

    markerMesh.count = FIDUCIAL_CAPACITY;
    markerMesh.instanceMatrix.needsUpdate = true;
    markerMesh.computeBoundingSphere();
    invalidate();
  }, [invalidate, transformHelper]);

  useLayoutEffect(() => {
    const markerMesh = markerMeshRef.current;
    if (!markerMesh) return;

    for (const position of OBSERVATORY_POSITIONS) {
      const markerState = markerStateForObservatoryPosition(
        position.index,
        safeActivePositionIndex,
      );
      colourHelper.set(MARKER_COLOURS[markerState]);
      markerMesh.setColorAt(position.index, colourHelper);
    }

    if (markerMesh.instanceColor) {
      markerMesh.instanceColor.needsUpdate = true;
    }
    invalidate();
  }, [colourHelper, invalidate, safeActivePositionIndex]);

  return (
    <group
      name="observatory-instrument-ring-structure"
      visible={safeVisibility > 0}
      userData={{
        placeholderOnly: true,
        positionCount: FIDUCIAL_CAPACITY,
        activePositionCount: OBSERVATORY_ACTIVE_POSITION_COUNT,
        representation: "structural-navigation-dial",
      }}
    >
      <mesh name="observatory-precision-dial" renderOrder={50}>
        <torusGeometry
          args={[
            OBSERVATORY_INSTRUMENT_RING_RADIUS,
            0.024,
            segments.radial,
            segments.tubular,
          ]}
        />
        <meshStandardMaterial
          color="#73837a"
          depthWrite={false}
          emissive="#65756d"
          emissiveIntensity={0.035}
          metalness={0.82}
          opacity={safeVisibility * 0.5}
          roughness={0.36}
          transparent
        />
      </mesh>

      <instancedMesh
        ref={markerMeshRef}
        args={[undefined, undefined, FIDUCIAL_CAPACITY]}
        name="observatory-engraved-position-fiducials"
        renderOrder={51}
      >
        <boxGeometry args={[0.038, 0.2, 0.032]} />
        <meshBasicMaterial
          color="#ffffff"
          depthWrite={false}
          opacity={safeVisibility}
          toneMapped={false}
          transparent
          vertexColors
        />
      </instancedMesh>
    </group>
  );
}
