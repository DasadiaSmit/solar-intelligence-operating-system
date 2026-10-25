"use client";

import { useMemo } from "react";
import { Color } from "three";
import type {
  AtmosphericObservationViewV1,
} from "@/features/visual-computing/atmospheric-observation-view";
import type {
  VisualQualityTier,
} from "@/features/visual-computing/renderer-policy";
import {
  ATMOSPHERIC_DISPLAY_LIMITS,
  CloudCoverageScreen,
  IrradiancePath,
  atmosphericChannelRatio,
  clampAtmosphericDisplayRatio,
} from "./AtmosphericObservationPrimitives";

export interface AtmosphericObservationInstrumentProps {
  readonly qualityTier?: VisualQualityTier;
  readonly view: AtmosphericObservationViewV1;
}

/**
 * Static one-hour atmospheric transfer schematic. It encodes supplied
 * magnitudes without claiming cloud altitude, geometry, motion, wind
 * direction, sub-hour causality, or measured plant response.
 */
export function AtmosphericObservationInstrument({
  qualityTier = "balanced",
  view,
}: AtmosphericObservationInstrumentProps) {
  const humidityRatio =
    clampAtmosphericDisplayRatio(view.weather.relativeHumidityPct / 100);
  const windRatio = atmosphericChannelRatio(
    view.weather.windSpeedMps,
    ATMOSPHERIC_DISPLAY_LIMITS.windSpeedMps,
  );
  const temperatureRatio = clampAtmosphericDisplayRatio(
    (
      view.weather.ambientTemperatureC
      - ATMOSPHERIC_DISPLAY_LIMITS.temperatureMinimumC
    ) / (
      ATMOSPHERIC_DISPLAY_LIMITS.temperatureMaximumC
      - ATMOSPHERIC_DISPLAY_LIMITS.temperatureMinimumC
    ),
  );
  const poaRatio = atmosphericChannelRatio(
    view.irradiance.effectivePoaWm2,
    ATMOSPHERIC_DISPLAY_LIMITS.poaWm2,
  );
  const acResponseRatio = clampAtmosphericDisplayRatio(
    view.energy.acEnergyKWh / Math.max(0.001, view.array.capacityKwDc),
  );
  const thermalColour = useMemo(
    () => new Color("#617f8b").lerp(
      new Color("#cb8d55"),
      temperatureRatio,
    ),
    [temperatureRatio],
  );
  const torusSegments =
    qualityTier === "scientific"
      ? 16
      : qualityTier === "balanced"
        ? 24
        : 32;

  return (
    <group
      name="atmospheric-observation-instrument"
      userData={{
        causalityClaim: view.relationship.causalityClaim,
        cloudAltitudeEncoding: "none",
        cloudMotionEncoding: "none",
        lifecycle: view.lifecycle,
        measuredPlantOutputClaim: false,
        representation: "linked-hour-atmospheric-transfer-schematic",
        resultId: view.resultId,
        temporalBasis: view.relationship.temporalBasis,
        timestampUtc: view.timestampUtc,
        verticalProfileEncoding: "none",
        windDirectionEncoding: "none",
      }}
    >
      <mesh
        name="atmospheric-observation-thermal-context"
        position={[0, 0.06, -0.04]}
        scale={[0.29, 0.12, 0.018]}
        userData={{
          ambientTemperatureC: view.weather.ambientTemperatureC,
          encoding: "colour-within-validated-provider-bounds",
        }}
      >
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial
          color={thermalColour}
          depthWrite={false}
          metalness={0.05}
          opacity={0.12}
          roughness={0.92}
          transparent
        />
      </mesh>

      <mesh
        name="atmospheric-observation-humidity-envelope"
        position={[0, 0.06, 0]}
        userData={{
          encoding: "envelope-opacity-and-thickness",
          relativeHumidityPct: view.weather.relativeHumidityPct,
        }}
      >
        <torusGeometry
          args={[
            0.215,
            0.004 + humidityRatio * 0.012,
            4,
            torusSegments,
          ]}
        />
        <meshBasicMaterial
          color="#8aaeb4"
          depthWrite={false}
          opacity={0.08 + humidityRatio * 0.46}
          toneMapped={false}
          transparent
        />
      </mesh>

      <mesh
        name="atmospheric-observation-directionless-wind-speed-ring"
        position={[0, 0.06, -0.01]}
        visible={windRatio > 0.001}
        userData={{
          directionEncoding: "none",
          displayMaximumMps: ATMOSPHERIC_DISPLAY_LIMITS.windSpeedMps,
          windSpeedMps: view.weather.windSpeedMps,
        }}
      >
        <torusGeometry
          args={[
            0.275,
            0.003 + windRatio * 0.014,
            4,
            torusSegments,
          ]}
        />
        <meshBasicMaterial
          color="#94aaa4"
          depthWrite={false}
          opacity={0.08 + windRatio * 0.58}
          toneMapped={false}
          transparent
        />
      </mesh>

      <CloudCoverageScreen
        cloudCoverPct={view.weather.cloudCoverPct}
        qualityTier={qualityTier}
      />

      <IrradiancePath
        colour="#a89457"
        end={[0.2, 0.27]}
        maximum={ATMOSPHERIC_DISPLAY_LIMITS.ghiWm2}
        name="atmospheric-observation-ghi-aperture"
        start={[-0.2, 0.27]}
        unit={view.units.irradiance}
        value={view.irradiance.ghiWm2}
      />
      <IrradiancePath
        colour="#e0bf63"
        end={[-0.035, -0.105]}
        maximum={ATMOSPHERIC_DISPLAY_LIMITS.dniWm2}
        name="atmospheric-observation-direct-normal-path"
        start={[-0.11, 0.26]}
        unit={view.units.irradiance}
        value={view.irradiance.dniWm2}
      />
      <IrradiancePath
        colour="#aebaa6"
        end={[0.04, -0.105]}
        maximum={ATMOSPHERIC_DISPLAY_LIMITS.dhiWm2}
        name="atmospheric-observation-diffuse-horizontal-path"
        start={[0.25, 0.21]}
        unit={view.units.irradiance}
        value={view.irradiance.dhiWm2}
      />

      <mesh
        name="atmospheric-observation-poa-collection-aperture"
        position={[0, -0.12, 0.02]}
        rotation={[Math.PI / 2, 0, 0]}
        visible={poaRatio > 0.001}
        userData={{
          displayMaximum: ATMOSPHERIC_DISPLAY_LIMITS.poaWm2,
          effectivePoaWm2: view.irradiance.effectivePoaWm2,
          geometryClaim: "collection-aperture-not-array-geometry",
          unit: view.units.irradiance,
        }}
      >
        <cylinderGeometry args={[0.115, 0.115, 0.018, torusSegments]} />
        <meshStandardMaterial
          color="#6e806f"
          emissive="#b39a50"
          emissiveIntensity={0.025 + poaRatio * 0.14}
          metalness={0.54}
          opacity={0.18 + poaRatio * 0.72}
          roughness={0.44}
          transparent
        />
      </mesh>

      <IrradiancePath
        colour="#8da773"
        end={[0, -0.245]}
        maximum={ATMOSPHERIC_DISPLAY_LIMITS.poaWm2}
        name="atmospheric-observation-effective-poa-path"
        start={[0, -0.13]}
        unit={view.units.irradiance}
        value={view.irradiance.effectivePoaWm2}
      />

      <mesh
        name="atmospheric-observation-one-hour-ac-response"
        position={[0, -0.27, 0.02]}
        scale={[
          0.7 + acResponseRatio * 0.3,
          0.7 + acResponseRatio * 0.3,
          1,
        ]}
        visible={acResponseRatio > 0.001}
        userData={{
          acEnergyKWh: view.energy.acEnergyKWh,
          capacityKwDc: view.array.capacityKwDc,
          causalityClaim: false,
          encoding: "one-hour-energy-to-configured-dc-capacity-display-ratio",
          unit: view.units.acEnergy,
        }}
      >
        <torusGeometry args={[0.06, 0.01, 4, torusSegments]} />
        <meshStandardMaterial
          color="#8eaa77"
          emissive="#8eaa77"
          emissiveIntensity={0.035 + acResponseRatio * 0.16}
          metalness={0.48}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}
