"use client";

import {
  forwardRef,
  useMemo,
  type RefObject,
} from "react";
import {
  AdditiveBlending,
  BackSide,
  Color,
  ShaderMaterial,
  Vector3,
  type Group,
} from "three";
import type { VisualQualityTier } from "@/features/visual-computing/renderer-policy";

const SOLAR_SURFACE_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;

  varying vec3 vObjectNormal;
  varying vec3 vObjectPosition;

  const float TAU = 6.28318530718;

  void main() {
    float phase = uTime * TAU / 180.0;
    vec3 unitPosition = normalize(position);
    float broadBand =
      sin((unitPosition.x * 7.0 + unitPosition.y * 5.0) + phase);
    float crossBand =
      sin((unitPosition.z * 11.0 - unitPosition.x * 4.0) - phase * 0.5);
    float displacement = (broadBand + crossBand) * 0.004;

    vObjectNormal = normalize(normal);
    vObjectPosition = unitPosition;

    vec3 transformed = position + normal * displacement;
    gl_Position =
      projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const SOLAR_SURFACE_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uIrradiance;
  uniform float uCloudFraction;
  uniform float uQualityScore;
  uniform float uSolarElevation;
  uniform vec3 uSunDirection;

  varying vec3 vObjectNormal;
  varying vec3 vObjectPosition;

  const float TAU = 6.28318530718;

  float hash31(vec3 point) {
    return fract(
      sin(dot(point, vec3(127.1, 311.7, 74.7))) * 43758.5453123
    );
  }

  float valueNoise(vec3 point) {
    vec3 cell = floor(point);
    vec3 local = fract(point);
    vec3 blend = local * local * (3.0 - 2.0 * local);
    float n000 = hash31(cell + vec3(0.0, 0.0, 0.0));
    float n100 = hash31(cell + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(cell + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(cell + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(cell + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(cell + vec3(1.0, 0.0, 1.0));
    float n011 = hash31(cell + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(cell + vec3(1.0, 1.0, 1.0));
    float nearLayer = mix(
      mix(n000, n100, blend.x),
      mix(n010, n110, blend.x),
      blend.y
    );
    float farLayer = mix(
      mix(n001, n101, blend.x),
      mix(n011, n111, blend.x),
      blend.y
    );
    return mix(nearLayer, farLayer, blend.z);
  }

  float plasmaFbm(vec3 point) {
    float sum = 0.0;
    float amplitude = 0.56;
    for (int octave = 0; octave < 4; octave++) {
      sum += amplitude * valueNoise(point);
      point = point * 2.03 + vec3(0.17, 0.31, 0.13);
      amplitude *= 0.48;
    }
    return sum;
  }

  void main() {
    float phase = uTime * TAU / 180.0;
    vec3 movingDomain =
      vObjectPosition * 4.2
      + vec3(phase * 0.16, -phase * 0.09, phase * 0.12);
    float broadPlasma = plasmaFbm(movingDomain);
    float finePlasma = plasmaFbm(
      movingDomain * 2.4
      + vec3(broadPlasma * 1.7)
    );
    float surfaceStructure = clamp(
      broadPlasma * 0.68 + finePlasma * 0.46,
      0.0,
      1.0
    );

    vec3 direction = normalize(uSunDirection + vec3(0.0001));
    float directionalContext =
      0.5 + 0.5 * dot(normalize(vObjectNormal), direction);
    float evidenceStrength =
      mix(0.70, 1.0, uQualityScore)
      * mix(0.74, 1.0, uIrradiance)
      * mix(0.90, 1.0, uSolarElevation);
    float atmosphericMute = mix(1.0, 0.84, uCloudFraction);

    vec3 deepGold = vec3(0.77, 0.29, 0.055);
    vec3 solarGold = vec3(1.0, 0.61, 0.17);
    vec3 hotIvory = vec3(1.0, 0.91, 0.68);
    vec3 colour = mix(
      deepGold,
      solarGold,
      smoothstep(0.18, 0.88, surfaceStructure)
    );
    colour = mix(
      colour,
      hotIvory,
      0.18
        + directionalContext * 0.2
        + smoothstep(0.68, 0.96, finePlasma) * 0.34
    );
    colour *= evidenceStrength * atmosphericMute;

    gl_FragColor = vec4(colour, 1.0);
  }
`;

const SOLAR_CORONA_VERTEX_SHADER = /* glsl */ `
  varying vec3 vViewNormal;
  varying vec3 vViewDirection;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewNormal = normalize(normalMatrix * normal);
    vViewDirection = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const SOLAR_CORONA_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uIrradiance;
  uniform float uCloudFraction;
  uniform float uQualityScore;

  varying vec3 vViewNormal;
  varying vec3 vViewDirection;

  const float TAU = 6.28318530718;

  void main() {
    float phase = uTime * TAU / 240.0;
    float rim = pow(
      1.0 - abs(dot(normalize(vViewNormal), normalize(vViewDirection))),
      2.4
    );
    float slowBreath = 0.94 + 0.06 * sin(phase);
    float evidenceStrength =
      mix(0.62, 1.0, uQualityScore)
      * mix(0.70, 1.0, uIrradiance)
      * mix(1.0, 0.86, uCloudFraction);
    float alpha = rim * 0.24 * slowBreath * evidenceStrength;
    vec3 colour = mix(
      vec3(0.95, 0.44, 0.10),
      vec3(1.0, 0.82, 0.45),
      rim
    );

    gl_FragColor = vec4(colour, alpha);
  }
`;

function createSurfaceUniforms() {
  return {
    uTime: { value: 0 },
    uIrradiance: { value: 0 },
    uCloudFraction: { value: 0 },
    uQualityScore: { value: 1 },
    uSolarElevation: { value: 0 },
    uSunDirection: { value: new Vector3(0, 1, 0) },
  };
}

function createCoronaUniforms() {
  return {
    uTime: { value: 0 },
    uIrradiance: { value: 0 },
    uCloudFraction: { value: 0 },
    uQualityScore: { value: 1 },
  };
}

export interface SolarBodyProps {
  readonly surfaceMaterialRef: RefObject<ShaderMaterial | null>;
  readonly coronaMaterialRef: RefObject<ShaderMaterial | null>;
  readonly qualityTier?: VisualQualityTier;
}

/**
 * A deterministic, texture-free Sun. Its visual state is updated exclusively
 * by HeliosHeroScene from the current clamped SceneFrameV1 values.
 */
export const SolarBody = forwardRef<Group, SolarBodyProps>(
  function SolarBody(
    {
      surfaceMaterialRef,
      coronaMaterialRef,
      qualityTier = "balanced",
    },
    ref,
  ) {
    const surfaceUniforms = useMemo(createSurfaceUniforms, []);
    const coronaUniforms = useMemo(createCoronaUniforms, []);
    const surfaceDetail =
      qualityTier === "scientific"
        ? 3
        : qualityTier === "balanced"
          ? 4
          : 5;
    const coronaDetail = Math.max(2, surfaceDetail - 1);

    return (
      <group
        ref={ref}
        name="solar-body"
        userData={{ representation: "contextual-schematic" }}
      >
        <mesh name="solar-photosphere" renderOrder={20}>
          <icosahedronGeometry args={[0.94, surfaceDetail]} />
          <shaderMaterial
            ref={surfaceMaterialRef}
            uniforms={surfaceUniforms}
            vertexShader={SOLAR_SURFACE_VERTEX_SHADER}
            fragmentShader={SOLAR_SURFACE_FRAGMENT_SHADER}
            toneMapped
          />
        </mesh>
        <mesh name="solar-corona" renderOrder={19} scale={1.12}>
          <icosahedronGeometry args={[0.94, coronaDetail]} />
          <shaderMaterial
            ref={coronaMaterialRef}
            uniforms={coronaUniforms}
            vertexShader={SOLAR_CORONA_VERTEX_SHADER}
            fragmentShader={SOLAR_CORONA_FRAGMENT_SHADER}
            blending={AdditiveBlending}
            depthWrite={false}
            side={BackSide}
            transparent
            toneMapped={false}
          />
        </mesh>
        <pointLight
          name="solar-local-light"
          color={new Color("#f3c36d")}
          intensity={2.1}
          distance={9}
          decay={2}
        />
      </group>
    );
  },
);
