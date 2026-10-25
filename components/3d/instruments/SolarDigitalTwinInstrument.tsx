"use client";

import type { VisualQualityTier } from
  "@/features/visual-computing/renderer-policy";
import type {
  SolarDigitalTwinViewV1,
} from "@/features/visual-computing/solar-digital-twin-view";

type Point2 = readonly [x: number, y: number];

const COLLECTION_POINT: Point2 = [-0.35, 0.09];
const CONVERSION_POINT: Point2 = [-0.08, 0.09];
const BUS_POINT: Point2 = [0.11, 0.09];
const DEMAND_POINT: Point2 = [0.35, 0.17];
const STORAGE_POINT: Point2 = [0.13, -0.18];
const GRID_POINT: Point2 = [0.38, -0.17];

function Conduit({
  colour,
  end,
  name,
  start,
}: {
  readonly colour: string;
  readonly end: Point2;
  readonly name: string;
  readonly start: Point2;
}) {
  const deltaX = end[0] - start[0];
  const deltaY = end[1] - start[1];
  const length = Math.hypot(deltaX, deltaY);

  return (
    <mesh
      name={name}
      position={[
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2,
        -0.015,
      ]}
      rotation={[0, 0, Math.atan2(deltaY, deltaX)]}
      userData={{ encoding: "system-topology-only" }}
    >
      <boxGeometry args={[length, 0.014, 0.012]} />
      <meshStandardMaterial
        color={colour}
        emissive={colour}
        emissiveIntensity={0.045}
        metalness={0.54}
        roughness={0.42}
      />
    </mesh>
  );
}

function CollectionSurface({
  azimuthDeg,
  tiltDeg,
}: {
  readonly azimuthDeg: number;
  readonly tiltDeg: number;
}) {
  const azimuthRad = azimuthDeg * Math.PI / 180;
  const tiltRad = tiltDeg * Math.PI / 180;

  return (
    <group
      name="digital-twin-configured-orientation-glyph"
      position={[...COLLECTION_POINT, 0.025]}
      rotation={[0, -azimuthRad, 0]}
      userData={{
        azimuthDeg,
        orientationFrame: "local-ENU-reference-glyph",
        tiltDeg,
      }}
    >
      <mesh rotation={[-tiltRad, 0, 0]}>
        <boxGeometry args={[0.27, 0.014, 0.17]} />
        <meshStandardMaterial
          color="#263f45"
          emissive="#9c8245"
          emissiveIntensity={0.05}
          metalness={0.58}
          roughness={0.36}
        />
      </mesh>
      <mesh position={[0, -0.045, 0]}>
        <cylinderGeometry args={[0.013, 0.018, 0.09, 6]} />
        <meshStandardMaterial
          color="#6c746f"
          metalness={0.68}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

function ConversionNode({
  radialSegments,
}: {
  readonly radialSegments: number;
}) {
  return (
    <group
      name="digital-twin-conversion-node"
      position={[...CONVERSION_POINT, 0]}
    >
      <mesh>
        <boxGeometry args={[0.13, 0.13, 0.07]} />
        <meshStandardMaterial
          color="#5f6863"
          metalness={0.72}
          roughness={0.38}
        />
      </mesh>
      <mesh position={[0, 0, 0.038]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.032, 0.006, 4, radialSegments]} />
        <meshStandardMaterial
          color="#cfb765"
          emissive="#cfb765"
          emissiveIntensity={0.08}
          metalness={0.5}
          roughness={0.34}
        />
      </mesh>
    </group>
  );
}

function DistributionNode() {
  return (
    <mesh
      name="digital-twin-distribution-node"
      position={[...BUS_POINT, 0]}
    >
      <cylinderGeometry args={[0.037, 0.037, 0.055, 8]} />
      <meshStandardMaterial
        color="#b6a35e"
        emissive="#8c793f"
        emissiveIntensity={0.05}
        metalness={0.62}
        roughness={0.36}
      />
    </mesh>
  );
}

function DemandNode() {
  return (
    <group
      name="digital-twin-demand-node"
      position={[...DEMAND_POINT, 0]}
    >
      <mesh>
        <boxGeometry args={[0.15, 0.13, 0.08]} />
        <meshStandardMaterial
          color="#53675d"
          metalness={0.52}
          roughness={0.48}
        />
      </mesh>
      <mesh position={[0, 0, 0.044]}>
        <circleGeometry args={[0.025, 8]} />
        <meshStandardMaterial
          color="#a8b9ac"
          emissive="#71877a"
          emissiveIntensity={0.04}
          metalness={0.38}
          roughness={0.46}
        />
      </mesh>
    </group>
  );
}

function StorageNode() {
  return (
    <group
      name="digital-twin-storage-node"
      position={[...STORAGE_POINT, 0]}
    >
      <mesh>
        <boxGeometry args={[0.13, 0.17, 0.07]} />
        <meshStandardMaterial
          color="#4f6268"
          metalness={0.58}
          roughness={0.42}
        />
      </mesh>
      <mesh position={[0, 0.07, 0.002]}>
        <boxGeometry args={[0.055, 0.018, 0.075]} />
        <meshStandardMaterial
          color="#819398"
          metalness={0.64}
          roughness={0.38}
        />
      </mesh>
    </group>
  );
}

function GridNode() {
  return (
    <group
      name="digital-twin-grid-intertie-node"
      position={[...GRID_POINT, 0]}
    >
      <mesh>
        <boxGeometry args={[0.022, 0.2, 0.025]} />
        <meshStandardMaterial
          color="#69716d"
          metalness={0.72}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 0.045, 0]}>
        <boxGeometry args={[0.14, 0.018, 0.022]} />
        <meshStandardMaterial
          color="#7a827e"
          metalness={0.7}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, -0.015, 0]}>
        <boxGeometry args={[0.1, 0.014, 0.02]} />
        <meshStandardMaterial
          color="#7a827e"
          metalness={0.7}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

export interface SolarDigitalTwinInstrumentProps {
  readonly qualityTier?: VisualQualityTier;
  readonly view: SolarDigitalTwinViewV1;
}

/**
 * A compact logical system schematic for Instrument 01. Geometry size and
 * route appearance never encode energy magnitude, module count, site terrain,
 * or any other unavailable physical layer. Exact facts remain in HTML.
 */
export function SolarDigitalTwinInstrument({
  qualityTier = "balanced",
  view,
}: SolarDigitalTwinInstrumentProps) {
  const { azimuthDeg, tiltDeg } = view.array;
  if (
    !Number.isFinite(azimuthDeg)
    || !Number.isFinite(tiltDeg)
    || azimuthDeg < 0
    || azimuthDeg >= 360
    || tiltDeg < 0
    || tiltDeg > 90
  ) {
    return null;
  }

  const radialSegments =
    qualityTier === "scientific" ? 8 : qualityTier === "balanced" ? 12 : 16;

  return (
    <group
      name="solar-digital-twin-instrument"
      userData={{
        arrayGeometryStatus: view.unavailableLayers.arrayGeometry.status,
        energyMagnitudeEncoding: "none",
        lifecycle: view.lifecycle,
        physicalReplica: false,
        representation: "configured-orientation-logical-system-schematic",
        resultId: view.resultId,
        scientificAuthority: "linked-html-facts",
        timestampUtc: view.timestampUtc,
      }}
    >
      <group
        name="digital-twin-system-topology"
        userData={{
          activeFlowEncoding: "none",
          groundRepresentation: "none",
          moduleLayoutRepresentation: "none",
        }}
      >
        <Conduit
          colour="#8e7b45"
          end={CONVERSION_POINT}
          name="digital-twin-route:collection-to-conversion"
          start={COLLECTION_POINT}
        />
        <Conduit
          colour="#8e7b45"
          end={BUS_POINT}
          name="digital-twin-route:conversion-to-distribution"
          start={CONVERSION_POINT}
        />
        <Conduit
          colour="#60766b"
          end={DEMAND_POINT}
          name="digital-twin-route:distribution-to-demand"
          start={BUS_POINT}
        />
        <Conduit
          colour="#566b72"
          end={STORAGE_POINT}
          name="digital-twin-route:distribution-storage-interface"
          start={BUS_POINT}
        />
        <Conduit
          colour="#686f6b"
          end={GRID_POINT}
          name="digital-twin-route:distribution-grid-interface"
          start={BUS_POINT}
        />
      </group>

      <CollectionSurface azimuthDeg={azimuthDeg} tiltDeg={tiltDeg} />
      <ConversionNode radialSegments={radialSegments} />
      <DistributionNode />
      <DemandNode />
      <StorageNode />
      <GridNode />
    </group>
  );
}
