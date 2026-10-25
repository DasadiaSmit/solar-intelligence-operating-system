"use client";

import { useMemo } from "react";
import {
  DoubleSide,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";
import type {
  ArrayEngineeringViewV1,
} from "@/features/visual-computing/array-engineering-view";
import type {
  VisualQualityTier,
} from "@/features/visual-computing/renderer-policy";

const DEG_TO_RAD = Math.PI / 180;
const LOCAL_UP = new Vector3(0, 1, 0);
const LOCAL_PLANE_NORMAL = new Vector3(0, 0, 1);

function finiteUnitVector(
  east: number,
  north: number,
  up: number,
): Vector3 | null {
  if (![east, north, up].every(Number.isFinite)) return null;
  const vector = new Vector3(east, up, -north);
  return vector.lengthSq() > Number.EPSILON
    ? vector.normalize()
    : null;
}

function arrayNormalThree(
  tiltDeg: number,
  azimuthDeg: number,
): Vector3 | null {
  if (
    !Number.isFinite(tiltDeg)
    || !Number.isFinite(azimuthDeg)
    || tiltDeg < 0
    || tiltDeg > 90
  ) {
    return null;
  }
  const tilt = tiltDeg * DEG_TO_RAD;
  const azimuth = azimuthDeg * DEG_TO_RAD;
  return finiteUnitVector(
    Math.sin(tilt) * Math.sin(azimuth),
    Math.sin(tilt) * Math.cos(azimuth),
    Math.cos(tilt),
  );
}

function vectorQuaternion(direction: Vector3): Quaternion {
  return new Quaternion().setFromUnitVectors(LOCAL_UP, direction);
}

function incidenceArcQuaternion(
  normal: Vector3,
  sunDirection: Vector3,
): Quaternion {
  const tangent = sunDirection.clone().addScaledVector(
    normal,
    -sunDirection.dot(normal),
  );
  if (tangent.lengthSq() <= 1e-10) {
    const reference =
      Math.abs(normal.y) < 0.9
        ? new Vector3(0, 1, 0)
        : new Vector3(1, 0, 0);
    tangent.crossVectors(reference, normal);
  }
  tangent.normalize();
  const axis = new Vector3().crossVectors(normal, tangent).normalize();
  return new Quaternion().setFromRotationMatrix(
    new Matrix4().makeBasis(normal, tangent, axis),
  );
}

function qualitySegments(qualityTier: VisualQualityTier): {
  readonly radial: number;
  readonly arc: number;
  readonly datum: number;
} {
  if (qualityTier === "scientific") {
    return { radial: 4, arc: 12, datum: 20 };
  }
  if (qualityTier === "balanced") {
    return { radial: 6, arc: 20, datum: 32 };
  }
  return { radial: 8, arc: 28, datum: 48 };
}

function VectorMarker({
  colour,
  direction,
  length,
  name,
  radialSegments,
}: {
  readonly colour: string;
  readonly direction: Vector3;
  readonly length: number;
  readonly name: string;
  readonly radialSegments: number;
}) {
  const quaternion = useMemo(
    () => vectorQuaternion(direction),
    [direction],
  );
  const midpoint = useMemo(
    () => direction.clone().multiplyScalar(length / 2),
    [direction, length],
  );
  const endpoint = useMemo(
    () => direction.clone().multiplyScalar(length),
    [direction, length],
  );

  return (
    <group name={name}>
      <mesh position={midpoint} quaternion={quaternion}>
        <cylinderGeometry
          args={[0.0045, 0.0045, length, radialSegments]}
        />
        <meshBasicMaterial color={colour} toneMapped={false} />
      </mesh>
      <mesh position={endpoint}>
        <sphereGeometry
          args={[0.014, radialSegments, Math.max(4, radialSegments)]}
        />
        <meshBasicMaterial color={colour} toneMapped={false} />
      </mesh>
    </group>
  );
}

export interface ArrayEngineeringInstrumentProps {
  readonly qualityTier?: VisualQualityTier;
  readonly view: ArrayEngineeringViewV1;
}

/**
 * A normalized orientation/aperture rig for one canonical linked hour. It
 * preserves ENU direction and incidence relationships without claiming module
 * dimensions, row layout, terrain, obstruction geometry or physical shadows.
 */
export function ArrayEngineeringInstrument({
  qualityTier = "balanced",
  view,
}: ArrayEngineeringInstrumentProps) {
  const normal = useMemo(
    () => arrayNormalThree(
      view.array.resolved.tiltDeg,
      view.array.resolved.azimuthDeg,
    ),
    [
      view.array.resolved.azimuthDeg,
      view.array.resolved.tiltDeg,
    ],
  );
  const sunDirection = useMemo(
    () => finiteUnitVector(
      view.sun.directionEnu.east,
      view.sun.directionEnu.north,
      view.sun.directionEnu.up,
    ),
    [
      view.sun.directionEnu.east,
      view.sun.directionEnu.north,
      view.sun.directionEnu.up,
    ],
  );
  const apertureQuaternion = useMemo(
    () =>
      normal
        ? new Quaternion().setFromUnitVectors(
            LOCAL_PLANE_NORMAL,
            normal,
          )
        : new Quaternion(),
    [normal],
  );
  const arcQuaternion = useMemo(
    () =>
      normal && sunDirection
        ? incidenceArcQuaternion(normal, sunDirection)
        : new Quaternion(),
    [normal, sunDirection],
  );
  if (!normal || !sunDirection) return null;

  const segments = qualitySegments(qualityTier);
  const incidenceAngleRad =
    view.irradiance.angleOfIncidenceDeg * DEG_TO_RAD;
  if (
    !Number.isFinite(incidenceAngleRad)
    || incidenceAngleRad < 0
    || incidenceAngleRad > Math.PI
  ) {
    return null;
  }
  const showIncidenceArc =
    view.sun.position.isDaylight
    && view.sun.position.elevationDeg > 0
    && incidenceAngleRad > 0.005;

  return (
    <group
      name="solar-array-engineering-instrument"
      rotation={[0.28, -0.42, 0]}
      userData={{
        arrayConfigurationAffectsSunPath:
          view.sun.arrayConfigurationAffectsSunPath,
        capacityAreaEncoding: "none",
        castShadowEncoding: "none",
        configuredAzimuthDeg: view.array.configured.azimuthDeg,
        configuredTiltDeg: view.array.configured.tiltDeg,
        lifecycle: view.lifecycle,
        moduleLayoutEncoding: "none",
        physicalReplica: false,
        representation: "normalized-enu-orientation-aperture-rig",
        resolvedAzimuthDeg: view.array.resolved.azimuthDeg,
        resolvedTiltDeg: view.array.resolved.tiltDeg,
        resultId: view.resultId,
        scientificAuthority: "linked-html-facts",
        sunDirectionBasis: view.sun.directionBasis,
        timestampUtc: view.linkedInterval.timestampUtc,
        trackingMotionEncoding: "none",
      }}
    >
      <mesh
        name="array-engineering-horizontal-enu-datum"
        quaternion={
          new Quaternion().setFromUnitVectors(
            LOCAL_PLANE_NORMAL,
            LOCAL_UP,
          )
        }
        userData={{
          terrainClaim: false,
          representation: "coordinate-datum-not-ground-surface",
        }}
      >
        <torusGeometry
          args={[0.235, 0.0025, 3, segments.datum]}
        />
        <meshBasicMaterial
          color="#697a73"
          depthWrite={false}
          opacity={0.38}
          toneMapped={false}
          transparent
        />
      </mesh>

      <mesh
        name="array-engineering-normalized-collection-aperture"
        quaternion={apertureQuaternion}
        userData={{
          capacityAreaEncoding: "none",
          moduleCountEncoding: "none",
          physicalDimensionsClaim: false,
          representation: "normalized-aperture-not-module-geometry",
        }}
      >
        <planeGeometry args={[0.38, 0.24]} />
        <meshStandardMaterial
          color="#29434a"
          emissive="#8d7942"
          emissiveIntensity={0.045}
          metalness={0.58}
          opacity={0.82}
          roughness={0.38}
          side={DoubleSide}
          transparent
        />
      </mesh>

      <mesh name="array-engineering-orientation-origin">
        <sphereGeometry
          args={[0.018, segments.radial, Math.max(4, segments.radial)]}
        />
        <meshStandardMaterial
          color="#a3ada7"
          metalness={0.65}
          roughness={0.38}
        />
      </mesh>

      <VectorMarker
        colour="#8da69a"
        direction={normal}
        length={0.31}
        name="array-engineering-panel-normal-vector"
        radialSegments={segments.radial}
      />
      <VectorMarker
        colour="#dfbd64"
        direction={sunDirection}
        length={0.42}
        name="array-engineering-authoritative-sun-vector"
        radialSegments={segments.radial}
      />

      <mesh
        name="array-engineering-angle-of-incidence-arc"
        quaternion={arcQuaternion}
        visible={showIncidenceArc}
        userData={{
          angleOfIncidenceDeg:
            view.irradiance.angleOfIncidenceDeg,
          angleBasis: "canonical-plane-of-array-result",
          incidenceAngleModifier:
            view.irradiance.incidenceAngleModifier,
          shadowClaim: false,
          unit: "deg",
        }}
      >
        <torusGeometry
          args={[
            0.11,
            0.0035,
            3,
            segments.arc,
            incidenceAngleRad,
          ]}
        />
        <meshBasicMaterial
          color="#c7a857"
          depthWrite={false}
          opacity={0.78}
          toneMapped={false}
          transparent
        />
      </mesh>
    </group>
  );
}
