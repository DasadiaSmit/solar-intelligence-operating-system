"use client";

import { useMemo } from "react";
import {
  deriveBatteryEnergyFlowView,
  type BatteryEnergyFlowRouteId,
} from "@/features/visual-computing/battery-energy-flow-view";
import type { BatteryEnergyFlowInstrumentProps } from "./types";

type Point = readonly [number, number, number];

const NODE_POSITIONS = {
  "pv-source": [-0.31, 0.12, 0],
  "distribution-bus": [-0.08, 0.04, 0],
  "site-load": [0.2, 0.14, 0],
  "battery-reservoir": [-0.01, -0.18, 0],
  "grid-intertie": [0.32, -0.06, 0],
  "curtailment-sink": [0.19, -0.25, 0],
} as const satisfies Readonly<Record<string, Point>>;

const ROUTE_ENDPOINTS = {
  "pv-to-load": [
    NODE_POSITIONS["pv-source"],
    NODE_POSITIONS["site-load"],
  ],
  "pv-to-battery": [
    NODE_POSITIONS["distribution-bus"],
    NODE_POSITIONS["battery-reservoir"],
  ],
  "battery-to-load": [
    NODE_POSITIONS["battery-reservoir"],
    NODE_POSITIONS["site-load"],
  ],
  "grid-to-load": [
    NODE_POSITIONS["grid-intertie"],
    NODE_POSITIONS["site-load"],
  ],
  "pv-to-grid": [
    NODE_POSITIONS["distribution-bus"],
    NODE_POSITIONS["grid-intertie"],
  ],
  "pv-to-curtailment": [
    NODE_POSITIONS["distribution-bus"],
    NODE_POSITIONS["curtailment-sink"],
  ],
} as const satisfies Readonly<
  Record<BatteryEnergyFlowRouteId, readonly [Point, Point]>
>;

const ROUTE_COLOURS = {
  "pv-to-load": "#e7c46a",
  "pv-to-battery": "#d3b65f",
  "battery-to-load": "#8ed4c5",
  "grid-to-load": "#9caeb1",
  "pv-to-grid": "#c9a853",
  "pv-to-curtailment": "#9b7457",
} as const satisfies Readonly<Record<BatteryEnergyFlowRouteId, string>>;

interface StaticEnergyChannelProps {
  readonly routeId: BatteryEnergyFlowRouteId;
  readonly magnitude: number;
  readonly activeInLinkedInterval: boolean;
  readonly activeInLinkedDay: boolean;
  readonly detailScale: number;
}

function StaticEnergyChannel({
  routeId,
  magnitude,
  activeInLinkedInterval,
  activeInLinkedDay,
  detailScale,
}: StaticEnergyChannelProps) {
  const [from, to] = ROUTE_ENDPOINTS[routeId];
  const deltaX = to[0] - from[0];
  const deltaY = to[1] - from[1];
  const length = Math.hypot(deltaX, deltaY);
  const angle = Math.atan2(deltaY, deltaX);
  const safeMagnitude = Number.isFinite(magnitude)
    ? Math.max(0, Math.min(1, magnitude))
    : 0;
  const width =
    (0.006 + safeMagnitude * 0.017) * detailScale;
  const opacity = activeInLinkedInterval
    ? 0.92
    : activeInLinkedDay
      ? 0.5
      : 0.15;
  const arrowProgress = 0.68;
  const arrowPosition: Point = [
    from[0] + deltaX * arrowProgress,
    from[1] + deltaY * arrowProgress,
    from[2] + 0.006,
  ];

  return (
    <group
      name={`battery-energy-route-${routeId}`}
      userData={{
        activeInLinkedDay,
        activeInLinkedInterval,
        magnitudeBasis: "linked-utc-day-accumulated-energy",
        normalizedMagnitude: safeMagnitude,
      }}
    >
      <mesh
        position={[
          (from[0] + to[0]) / 2,
          (from[1] + to[1]) / 2,
          from[2],
        ]}
        rotation={[0, 0, angle]}
        scale={[length, width, width]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color={ROUTE_COLOURS[routeId]}
          depthWrite={false}
          opacity={opacity}
          toneMapped={false}
          transparent
        />
      </mesh>
      <mesh
        position={arrowPosition}
        rotation={[0, 0, angle - Math.PI / 2]}
      >
        <coneGeometry args={[width * 1.8, width * 3.8, 3]} />
        <meshBasicMaterial
          color={ROUTE_COLOURS[routeId]}
          depthWrite={false}
          opacity={Math.min(1, opacity + 0.08)}
          toneMapped={false}
          transparent
        />
      </mesh>
    </group>
  );
}

/**
 * A static logical allocation schematic. Direction, linked-day route
 * magnitude, and bounded state of charge are the only spatial encodings.
 * Exact interval energy and provenance remain in semantic HTML.
 */
export default function BatteryEnergyFlowInstrument({
  qualityTier = "balanced",
  result,
}: BatteryEnergyFlowInstrumentProps) {
  const derived = useMemo(
    () => deriveBatteryEnergyFlowView(result),
    [result],
  );
  if (derived.status !== "ready") return null;

  const view = derived.view;
  const detailScale =
    qualityTier === "scientific"
      ? 0.82
      : qualityTier === "balanced"
        ? 1
        : 1.08;
  const batteryFill = view.spatial.batteryOperatingBandFill;
  const batteryFillHeight = Math.max(0.008, batteryFill * 0.14);

  return (
    <group
      name="battery-energy-flow-instrument"
      rotation={[0.16, -0.25, 0]}
      userData={{
        animatedParticles: false,
        exactValuesRemainHtml:
          view.visualEncoding.exactValuesRemainHtml,
        livePowerFlow: view.visualEncoding.livePowerFlow,
        physicalTopology: view.visualEncoding.physicalTopology,
        representation:
          "normalized-logical-energy-allocation",
        resultId: view.resultId,
        scientificAuthority: "linked-html-energy-ledger",
      }}
    >
      <group
        name="battery-energy-logical-routing-plane"
        userData={{
          gridIntertieCount: 1,
          magnitudeBasis: view.spatial.magnitudeBasis,
          physicalDimensionsClaim: false,
        }}
      >
        {view.spatial.routes.map((route) => (
          <StaticEnergyChannel
            key={route.id}
            routeId={route.id}
            magnitude={route.normalizedDayMagnitude}
            activeInLinkedInterval={route.activeInLinkedInterval}
            activeInLinkedDay={route.activeInLinkedDay}
            detailScale={detailScale}
          />
        ))}
      </group>

      <group name="battery-energy-logical-nodes">
        <mesh
          name="battery-energy-pv-source"
          position={NODE_POSITIONS["pv-source"]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.055, 0.055, 0.018, 20]} />
          <meshStandardMaterial
            color="#e7c46a"
            emissive="#8f7438"
            emissiveIntensity={0.12}
            metalness={0.5}
            roughness={0.4}
          />
        </mesh>

        <mesh
          name="battery-energy-distribution-bus"
          position={NODE_POSITIONS["distribution-bus"]}
          scale={[0.035, 0.035, 0.035]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#d9d2bb"
            emissive="#6b6658"
            emissiveIntensity={0.06}
            metalness={0.72}
            roughness={0.28}
          />
        </mesh>

        <mesh
          name="battery-energy-site-load"
          position={NODE_POSITIONS["site-load"]}
          scale={[0.1, 0.08, 0.055]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#82908a"
            emissive="#44504b"
            emissiveIntensity={0.05}
            metalness={0.6}
            roughness={0.34}
          />
        </mesh>

        <group
          name="battery-energy-bounded-reservoir"
          position={NODE_POSITIONS["battery-reservoir"]}
          userData={{
            fillBasis: "configured-operating-soc-band",
            normalizedFill: batteryFill,
            physicalBatteryClaim: false,
          }}
        >
          <mesh scale={[0.12, 0.18, 0.07]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial
              color="#8ed4c5"
              depthWrite={false}
              opacity={0.38}
              toneMapped={false}
              transparent
              wireframe
            />
          </mesh>
          <mesh
            position={[0, -0.09 + batteryFillHeight / 2, 0]}
            scale={[0.096, batteryFillHeight, 0.052]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#8ed4c5"
              emissive="#477a70"
              emissiveIntensity={0.1}
              metalness={0.48}
              roughness={0.35}
            />
          </mesh>
        </group>

        <mesh
          name="battery-energy-grid-intertie"
          position={NODE_POSITIONS["grid-intertie"]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.055, 0.009, 8, 24]} />
          <meshBasicMaterial
            color="#9caeb1"
            depthWrite={false}
            opacity={0.72}
            toneMapped={false}
            transparent
          />
        </mesh>

        <mesh
          name="battery-energy-curtailment-sink"
          position={NODE_POSITIONS["curtailment-sink"]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.025, 0.04, 0.02, 4]} />
          <meshBasicMaterial
            color="#9b7457"
            depthWrite={false}
            opacity={0.5}
            toneMapped={false}
            transparent
          />
        </mesh>
      </group>
    </group>
  );
}
