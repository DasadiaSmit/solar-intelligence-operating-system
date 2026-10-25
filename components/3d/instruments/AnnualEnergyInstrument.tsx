"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
} from "react";
import {
  Color,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  NormalBlending,
  ShaderMaterial,
  Sphere,
  Vector3,
} from "three";
import type {
  AnnualEnergyViewV1,
} from "@/features/visual-computing/annual-energy-view";
import {
  ANNUAL_ENERGY_RECORD_COUNT,
  type MeteorologicalSeason,
} from "@/features/visual-computing/annual-energy-frame";
import type {
  ObservatoryInstrumentPresentationState,
} from "@/features/visual-computing/observatory-instrument-presentation";
import type {
  VisualQualityTier,
} from "@/features/visual-computing/renderer-policy";
import type {
  ObservatoryInstrumentPresentationHandle,
} from "./types";

const ORBIT_RADIUS = 0.17;
const PRODUCTION_BASE_RADIUS = 0.15;
const PRODUCTION_RADIAL_RANGE = 0.3;
const GLYPH_BOUNDING_RADIUS = 0.01;

const SEASON_COLOURS: Readonly<Record<MeteorologicalSeason, Color>> =
  Object.freeze({
    winter: new Color("#667982"),
    spring: new Color("#7d906c"),
    summer: new Color("#ad9659"),
    autumn: new Color("#927158"),
  });

const ANNUAL_ENERGY_VERTEX_SHADER = /* glsl */ `
  uniform float uFormationProgress;
  uniform float uGlyphSize;

  attribute vec2 aChronologyDirection;
  attribute float aEnergyRatio;
  attribute float aQuality;
  attribute vec3 aSeasonColour;

  varying float vGlyphRadius;
  varying float vQuality;
  varying vec3 vSeasonColour;

  const float ORBIT_RADIUS = ${ORBIT_RADIUS.toFixed(2)};
  const float PRODUCTION_BASE_RADIUS =
    ${PRODUCTION_BASE_RADIUS.toFixed(2)};
  const float PRODUCTION_RADIAL_RANGE =
    ${PRODUCTION_RADIAL_RANGE.toFixed(2)};

  void main() {
    float formation = smoothstep(
      0.0,
      1.0,
      clamp(uFormationProgress, 0.0, 1.0)
    );
    float productionRadius =
      PRODUCTION_BASE_RADIUS
      + clamp(aEnergyRatio, 0.0, 1.0) * PRODUCTION_RADIAL_RANGE;
    float radius = mix(ORBIT_RADIUS, productionRadius, formation);
    vec2 centre = aChronologyDirection * radius;
    vec3 transformed = vec3(
      centre + position.xy * uGlyphSize,
      position.z
    );

    vGlyphRadius = length(position.xy);
    vQuality = clamp(aQuality, 0.0, 1.0);
    vSeasonColour = aSeasonColour;

    gl_Position =
      projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const ANNUAL_ENERGY_FRAGMENT_SHADER = /* glsl */ `
  varying float vGlyphRadius;
  varying float vQuality;
  varying vec3 vSeasonColour;

  void main() {
    float edge = 1.0 - smoothstep(0.55, 1.0, vGlyphRadius);
    float qualityLuminance = mix(0.36, 1.0, vQuality);
    vec3 colour = vSeasonColour * qualityLuminance;

    gl_FragColor = vec4(colour, edge * 0.62);
  }
`;

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function qualityParameters(qualityTier: VisualQualityTier): {
  readonly glyphSegments: number;
  readonly glyphSize: number;
} {
  if (qualityTier === "scientific") {
    return { glyphSegments: 3, glyphSize: 0.0012 };
  }
  if (qualityTier === "balanced") {
    return { glyphSegments: 6, glyphSize: 0.0016 };
  }
  return { glyphSegments: 8, glyphSize: 0.002 };
}

function glyphVertices(segmentCount: number): Float32Array {
  const values = new Float32Array(segmentCount * 9);
  let offset = 0;
  for (let segment = 0; segment < segmentCount; segment += 1) {
    const firstAngle = segment / segmentCount * Math.PI * 2;
    const secondAngle = (segment + 1) / segmentCount * Math.PI * 2;
    values[offset] = 0;
    values[offset + 1] = 0;
    values[offset + 2] = 0;
    values[offset + 3] = Math.cos(firstAngle);
    values[offset + 4] = Math.sin(firstAngle);
    values[offset + 5] = 0;
    values[offset + 6] = Math.cos(secondAngle);
    values[offset + 7] = Math.sin(secondAngle);
    values[offset + 8] = 0;
    offset += 9;
  }
  return values;
}

function meteorologicalSeason(
  month: number,
  hemisphere: AnnualEnergyViewV1["calendar"]["hemisphere"],
): MeteorologicalSeason {
  const northern =
    month === 12 || month <= 2
      ? "winter"
      : month <= 5
        ? "spring"
        : month <= 8
          ? "summer"
          : "autumn";
  if (hemisphere !== "southern") return northern;
  if (northern === "winter") return "summer";
  if (northern === "spring") return "autumn";
  if (northern === "summer") return "winter";
  return "spring";
}

function annualGeometry(
  view: AnnualEnergyViewV1,
  qualityTier: VisualQualityTier,
): InstancedBufferGeometry | null {
  const { calendar, series } = view;
  const columns = [
    series.generationAcKWh,
    series.qualityScores,
  ];
  const startMs = Date.parse(calendar.startTimestampUtc);
  const intervalMs = calendar.intervalSeconds * 1_000;
  if (
    calendar.recordCount !== ANNUAL_ENERGY_RECORD_COUNT
    || !Number.isFinite(startMs)
    || intervalMs !== 3_600_000
    || columns.some(
      (column) => column.length !== ANNUAL_ENERGY_RECORD_COUNT,
    )
  ) {
    return null;
  }

  let peakHourlyEnergyKWh = 0;
  const derivedMonths = new Uint8Array(ANNUAL_ENERGY_RECORD_COUNT);
  const timestamp = new Date(startMs);
  for (let index = 0; index < ANNUAL_ENERGY_RECORD_COUNT; index += 1) {
    const energyKWh = series.generationAcKWh[index];
    const quality = series.qualityScores[index];
    timestamp.setTime(startMs + index * intervalMs);
    const month = timestamp.getUTCMonth() + 1;
    if (
      month < 1
      || month > 12
      || !Number.isFinite(energyKWh)
      || energyKWh < 0
      || !Number.isFinite(quality)
      || quality < 0
      || quality > 1
    ) {
      return null;
    }
    derivedMonths[index] = month;
    peakHourlyEnergyKWh = Math.max(peakHourlyEnergyKWh, energyKWh);
  }

  const chronologyDirections = new Float32Array(
    ANNUAL_ENERGY_RECORD_COUNT * 2,
  );
  const energyRatios = new Float32Array(ANNUAL_ENERGY_RECORD_COUNT);
  const quality = new Float32Array(ANNUAL_ENERGY_RECORD_COUNT);
  const seasonColours = new Float32Array(
    ANNUAL_ENERGY_RECORD_COUNT * 3,
  );
  for (let index = 0; index < ANNUAL_ENERGY_RECORD_COUNT; index += 1) {
    const season = meteorologicalSeason(
      derivedMonths[index],
      calendar.hemisphere,
    );
    const colour = SEASON_COLOURS[season];
    const angle =
      Math.PI / 2
      - index / ANNUAL_ENERGY_RECORD_COUNT * Math.PI * 2;
    chronologyDirections[index * 2] = Math.cos(angle);
    chronologyDirections[index * 2 + 1] = Math.sin(angle);
    energyRatios[index] =
      peakHourlyEnergyKWh > 0
        ? clampUnit(series.generationAcKWh[index] / peakHourlyEnergyKWh)
        : 0;
    quality[index] = series.qualityScores[index];
    colour.toArray(seasonColours, index * 3);
  }

  const { glyphSegments } = qualityParameters(qualityTier);
  const geometry = new InstancedBufferGeometry();
  geometry.name = "annual-energy-8760-hour-instanced-geometry";
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(glyphVertices(glyphSegments), 3),
  );
  geometry.setAttribute(
    "aChronologyDirection",
    new InstancedBufferAttribute(chronologyDirections, 2),
  );
  geometry.setAttribute(
    "aEnergyRatio",
    new InstancedBufferAttribute(energyRatios, 1),
  );
  geometry.setAttribute(
    "aQuality",
    new InstancedBufferAttribute(quality, 1),
  );
  geometry.setAttribute(
    "aSeasonColour",
    new InstancedBufferAttribute(seasonColours, 3),
  );
  geometry.instanceCount = ANNUAL_ENERGY_RECORD_COUNT;
  geometry.boundingSphere = new Sphere(
    new Vector3(),
    Math.max(
      ORBIT_RADIUS,
      PRODUCTION_BASE_RADIUS + PRODUCTION_RADIAL_RANGE,
    ) + GLYPH_BOUNDING_RADIUS,
  );
  geometry.userData = {
    instanceCount: ANNUAL_ENERGY_RECORD_COUNT,
    peakHourlyEnergyKWh,
  };
  return geometry;
}

function annualEnergyMaterial(): ShaderMaterial {
  const material = new ShaderMaterial({
    blending: NormalBlending,
    depthTest: true,
    depthWrite: false,
    fragmentShader: ANNUAL_ENERGY_FRAGMENT_SHADER,
    transparent: true,
    uniforms: {
      uFormationProgress: { value: 0 },
      uGlyphSize: { value: 0.0016 },
    },
    vertexShader: ANNUAL_ENERGY_VERTEX_SHADER,
  });
  material.name = "annual-energy-8760-hour-material";
  material.toneMapped = false;
  return material;
}

export type AnnualEnergyInstrumentHandle =
  ObservatoryInstrumentPresentationHandle;

export interface AnnualEnergyInstrumentProps {
  readonly qualityTier?: VisualQualityTier;
  readonly view: AnnualEnergyViewV1;
}

/**
 * One draw-call annual production formation. Every canonical hourly sample is
 * retained; exact values and explanations remain authoritative in HTML.
 */
export const AnnualEnergyInstrument = forwardRef<
  AnnualEnergyInstrumentHandle,
  AnnualEnergyInstrumentProps
>(function AnnualEnergyInstrument(
  {
    qualityTier = "balanced",
    view,
  },
  ref,
) {
  const geometry = useMemo(
    () => annualGeometry(view, qualityTier),
    [qualityTier, view],
  );
  const material = useMemo(annualEnergyMaterial, []);

  useImperativeHandle(
    ref,
    () => ({
      applyPresentation(
        presentation: ObservatoryInstrumentPresentationState,
      ) {
        material.uniforms.uFormationProgress.value =
          clampUnit(presentation.formationProgress);
      },
    }),
    [material],
  );

  useLayoutEffect(() => {
    material.uniforms.uGlyphSize.value =
      qualityParameters(qualityTier).glyphSize;
  }, [material, qualityTier]);

  useEffect(
    () => () => {
      geometry?.dispose();
    },
    [geometry],
  );
  useEffect(
    () => () => {
      material.dispose();
    },
    [material],
  );

  if (!geometry) return null;

  return (
    <group
      dispose={null}
      name="annual-energy-observatory-instrument"
      userData={{
        annualSampleCount: ANNUAL_ENERGY_RECORD_COUNT,
        chronologyEncoding: "canonical-hour-index-clockwise-from-top",
        drawPathCount: 1,
        energyEncoding:
          "radial-displacement-by-hourly-ac-energy-to-annual-peak-ratio",
        forecastAccuracyClaim: false,
        formationControl: "external-uniform",
        geometryClaim: "annual-production-data-glyph-not-physical-orbit",
        lifecycle: view.lifecycle,
        measuredPlantOutputClaim: false,
        qualityEncoding: "luminance-reduction-only",
        representation: "annual-hourly-production-formation",
        resultId: view.resultId,
        sampleDropping: false,
        seasonEncoding:
          "meteorological-season-from-calendar-month-and-site-hemisphere",
        scientificAuthority: "linked-html-facts",
      }}
    >
      <mesh
        geometry={geometry}
        material={material}
        name="annual-energy-8760-hour-samples"
        renderOrder={60}
        userData={{
          instanceCount: geometry.instanceCount,
          intervalSeconds: view.calendar.intervalSeconds,
          peakHourlyEnergyKWh:
            geometry.userData.peakHourlyEnergyKWh,
        }}
      />
    </group>
  );
});
