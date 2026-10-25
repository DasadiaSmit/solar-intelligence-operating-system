"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { InstancedMesh } from "three";
import {
  deriveScenarioComparisonView,
} from "@/features/visual-computing/scenario-comparison-view";
import type { ScenarioComparisonInstrumentProps } from "./types";

const CHAMBER_CAPACITY = 5;
const CHAMBER_SPACING = 0.135;
const CHAMBER_WIDTH = 0.105;
const CHAMBER_HEIGHT = 0.28;
const CHAMBER_DEPTH = 0.12;
const CHAMBER_FLOOR_Y = -CHAMBER_HEIGHT / 2;
const MINIMUM_COLUMN_HEIGHT = 0.025;
const RESPONSE_COLUMN_RANGE = 0.19;
const BASELINE_RESPONSE = 0.5;
const BASELINE_DATUM_Y =
  CHAMBER_FLOOR_Y
  + MINIMUM_COLUMN_HEIGHT
  + RESPONSE_COLUMN_RANGE * BASELINE_RESPONSE;

const STRESS_CHAMBER_CAPACITY = CHAMBER_CAPACITY - 1;

function chamberX(index: number): number {
  return (
    index - (CHAMBER_CAPACITY - 1) / 2
  ) * CHAMBER_SPACING;
}

function writeScaleTranslationMatrix(
  mesh: InstancedMesh,
  index: number,
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
): void {
  mesh.instanceMatrix.array.set(
    [
      scale[0], 0, 0, 0,
      0, scale[1], 0, 0,
      0, 0, scale[2], 0,
      position[0], position[1], position[2], 1,
    ],
    index * 16,
  );
}

function responseFor(
  deltaPct: number,
  largestAbsoluteDeltaPct: number,
): number {
  if (
    !Number.isFinite(deltaPct)
    || !Number.isFinite(largestAbsoluteDeltaPct)
    || largestAbsoluteDeltaPct <= Number.EPSILON
  ) {
    return BASELINE_RESPONSE;
  }
  return Math.max(
    0,
    Math.min(
      1,
      BASELINE_RESPONSE
        + BASELINE_RESPONSE * deltaPct / largestAbsoluteDeltaPct,
    ),
  );
}

/**
 * Five identical normalized chambers compare signed annual-generation deltas.
 * No chamber claims weather geometry, physical equipment, event probability,
 * damage, or exact numerical authority; those remain in semantic HTML.
 */
export default function ScenarioComparisonInstrument({
  qualityTier = "balanced",
  result,
}: ScenarioComparisonInstrumentProps) {
  const derived = useMemo(
    () => deriveScenarioComparisonView(result),
    [result],
  );
  const stressChamberMeshRef = useRef<InstancedMesh>(null);
  const stressResponseMeshRef = useRef<InstancedMesh>(null);
  const responseValues = useMemo(() => {
    if (derived.status !== "ready") return [];
    const largestAbsoluteDeltaPct = Math.max(
      0,
      ...derived.view.chambers.map(
        (chamber) => Math.abs(chamber.generationDeltaPct),
      ),
    );
    return derived.view.chambers.map((chamber) =>
      responseFor(
        chamber.generationDeltaPct,
        largestAbsoluteDeltaPct,
      ));
  }, [derived]);

  useLayoutEffect(() => {
    if (derived.status !== "ready") return;
    const chamberMesh = stressChamberMeshRef.current;
    const responseMesh = stressResponseMeshRef.current;
    if (!chamberMesh || !responseMesh) return;

    for (
      let chamberIndex = 1;
      chamberIndex < derived.view.chambers.length;
      chamberIndex += 1
    ) {
      const instanceIndex = chamberIndex - 1;
      const x = chamberX(chamberIndex);
      writeScaleTranslationMatrix(
        chamberMesh,
        instanceIndex,
        [x, 0, 0],
        [CHAMBER_WIDTH, CHAMBER_HEIGHT, CHAMBER_DEPTH],
      );

      const response =
        responseValues[chamberIndex] ?? BASELINE_RESPONSE;
      const columnHeight =
        MINIMUM_COLUMN_HEIGHT + RESPONSE_COLUMN_RANGE * response;
      writeScaleTranslationMatrix(
        responseMesh,
        instanceIndex,
        [x, CHAMBER_FLOOR_Y + columnHeight / 2, 0],
        [0.034, columnHeight, 0.034],
      );
    }
    chamberMesh.count = STRESS_CHAMBER_CAPACITY;
    responseMesh.count = STRESS_CHAMBER_CAPACITY;
    chamberMesh.instanceMatrix.needsUpdate = true;
    responseMesh.instanceMatrix.needsUpdate = true;
    chamberMesh.computeBoundingSphere();
    responseMesh.computeBoundingSphere();
  }, [derived, responseValues]);

  if (derived.status !== "ready") return null;

  const frameOpacity =
    qualityTier === "scientific"
      ? 0.28
      : qualityTier === "balanced"
        ? 0.38
        : 0.46;
  const baselineColumnHeight =
    MINIMUM_COLUMN_HEIGHT
    + RESPONSE_COLUMN_RANGE
      * (responseValues[0] ?? BASELINE_RESPONSE);

  return (
    <group
      name="scenario-comparison-instrument"
      rotation={[0.18, -0.32, 0]}
      userData={{
        chamberCount: derived.view.chambers.length,
        chamberIds: derived.view.chambers.map(
          (chamber) => chamber.id,
        ),
        exactValuesRemainHtml:
          derived.view.visualEncoding.exactValuesRemainHtml,
        physicalWeatherGeometry:
          derived.view.visualEncoding.physicalWeatherGeometry,
        probabilityEncoding:
          derived.view.visualEncoding.probabilityEncoding,
        representation:
          "normalized-parallel-deterministic-comparison-chambers",
        resultId: derived.view.resultId,
        responseEncoding: derived.view.visualEncoding.kind,
        scientificAuthority: "linked-html-comparison",
      }}
    >
      <group
        name="scenario-comparison-normalized-chambers"
        userData={{
          physicalDimensionsClaim: false,
          weatherVolumeClaim: false,
        }}
      >
        <mesh
          name="scenario-comparison-baseline-chamber"
          position={[chamberX(0), 0, 0]}
          scale={[CHAMBER_WIDTH, CHAMBER_HEIGHT, CHAMBER_DEPTH]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="#b99a54"
            depthWrite={false}
            opacity={frameOpacity}
            toneMapped={false}
            transparent
            wireframe
          />
        </mesh>
        <instancedMesh
          ref={stressChamberMeshRef}
          args={[undefined, undefined, STRESS_CHAMBER_CAPACITY]}
          name="scenario-comparison-stress-chambers"
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="#71827b"
            depthWrite={false}
            opacity={frameOpacity}
            toneMapped={false}
            transparent
            wireframe
          />
        </instancedMesh>
      </group>

      <group
        name="scenario-comparison-generation-response-columns"
        userData={{
          exactValueEncoding: false,
          responseEncoding:
            "signed-delta-normalized-to-largest-absolute-delta",
        }}
      >
        <mesh
          name="scenario-comparison-baseline-response-column"
          position={[
            chamberX(0),
            CHAMBER_FLOOR_Y + baselineColumnHeight / 2,
            0,
          ]}
          scale={[0.034, baselineColumnHeight, 0.034]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#b99a54"
            emissive="#7b6b3f"
            emissiveIntensity={0.04}
            metalness={0.58}
            opacity={0.78}
            roughness={0.42}
            transparent
          />
        </mesh>
        <instancedMesh
          ref={stressResponseMeshRef}
          args={[undefined, undefined, STRESS_CHAMBER_CAPACITY]}
          name="scenario-comparison-stress-response-columns"
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#d1b66c"
            emissive="#7b6b3f"
            emissiveIntensity={0.04}
            metalness={0.58}
            opacity={0.78}
            roughness={0.42}
            transparent
          />
        </instancedMesh>
      </group>

      <mesh
        name="scenario-comparison-zero-delta-datum"
        position={[0, BASELINE_DATUM_Y, CHAMBER_DEPTH / 2 + 0.004]}
        userData={{
          physicalBoundaryClaim: false,
          representation: "zero-delta-comparison-datum",
        }}
      >
        <boxGeometry
          args={[
            CHAMBER_SPACING * CHAMBER_CAPACITY,
            0.003,
            0.003,
          ]}
        />
        <meshBasicMaterial
          color="#c0a65f"
          depthWrite={false}
          opacity={0.64}
          toneMapped={false}
          transparent
        />
      </mesh>
    </group>
  );
}
