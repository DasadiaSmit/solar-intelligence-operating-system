"use client";

import {
  Component,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DataTexture,
  EquirectangularReflectionMapping,
  Float32BufferAttribute,
  Group,
  LinearFilter,
  PerspectiveCamera,
  Quaternion,
  RGBAFormat,
  SRGBColorSpace,
  Texture,
  TubeGeometry,
  Vector3,
} from "three";
import type { SunlitHour } from "@/features/sunlit-observatory/frame";
import styles from "./SunlitScene.module.css";

export type SunlitSceneMode = "overview" | "array" | "battery";

export interface SunlitSceneProps {
  readonly mode: SunlitSceneMode;
  readonly hour: SunlitHour;
  readonly array: {
    readonly tiltDeg: number;
    readonly azimuthDeg: number;
    readonly capacityKwDc: number;
  };
  readonly battery: {
    readonly capacityKWh: number;
    readonly maxSocFraction: number;
  };
  readonly reducedMotion: boolean;
  readonly active?: boolean;
  readonly quality?: "balanced" | "low";
}

type Vec3 = [number, number, number];
type LabelKey = "sun" | "normal" | "solar" | "demand" | "grid" | "battery" | "soc";
type LabelElements = Partial<Record<LabelKey, HTMLSpanElement | null>>;
const UP = new Vector3(0, 1, 0);
const DEG = Math.PI / 180;
const GOLD = "#f8c871";
const WHITE = "#f5fbff";
const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

function direction(azimuthDeg: number, elevationDeg: number): Vector3 {
  const azimuth = azimuthDeg * DEG;
  const elevation = elevationDeg * DEG;
  return new Vector3(
    Math.cos(elevation) * Math.sin(azimuth),
    Math.sin(elevation),
    -Math.cos(elevation) * Math.cos(azimuth),
  );
}

function arrayNormal(tiltDeg: number, azimuthDeg: number): Vector3 {
  return direction(azimuthDeg, 90 - tiltDeg);
}

function subscribeVisibility(update: () => void) {
  document.addEventListener("visibilitychange", update);
  return () => document.removeEventListener("visibilitychange", update);
}
const visibilitySnapshot = () => document.visibilityState !== "hidden";
const serverVisibility = () => true;
const noSubscription = () => () => {};
const webglSnapshot = () => typeof WebGL2RenderingContext !== "undefined";
const serverWebgl = () => false;

class SceneBoundary extends Component<{
  children: ReactNode;
  onFailure: () => void;
}, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** A tiny local lighting map; no photograph, external HDR or network dependency. */
function studioEnvironment(): DataTexture {
  const width = 256;
  const height = 128;
  const data = new Uint8Array(width * height * 4);
  const blue = new Color("#75b4e3");
  const ivory = new Color("#fff5dd");
  const color = new Color();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const v = y / height;
      const horizon = Math.exp(-Math.pow((v - 0.55) / 0.19, 2));
      const strip = Math.exp(-Math.pow((u - 0.25) / 0.033, 2))
        + Math.exp(-Math.pow((u - 0.72) / 0.06, 2));
      const amount = clamp01(horizon * 0.58 + strip * 0.75);
      color.copy(blue).lerp(ivory, amount);
      const index = (y * width + x) * 4;
      data[index] = Math.round(color.r * 255);
      data[index + 1] = Math.round(color.g * 255);
      data[index + 2] = Math.round(color.b * 255);
      data[index + 3] = 255;
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat);
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function glowTexture(core = false): DataTexture {
  const side = core ? 96 : 64;
  const data = new Uint8Array(side * side * 4);
  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const distance = Math.hypot((x + 0.5) / side - 0.5, (y + 0.5) / side - 0.5) * 2;
      const edge = clamp01((distance - 0.23) / 0.77);
      const alpha = core
        ? 1 - edge * edge * (3 - 2 * edge)
        : Math.max(0, Math.exp(-distance * distance * 5) - 0.0067);
      const index = (y * side + x) * 4;
      data[index] = 255;
      data[index + 1] = core ? Math.round(253 - 53 * clamp01(distance)) : 201;
      data[index + 2] = core ? Math.round(231 - 116 * clamp01(distance)) : 119;
      data[index + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new DataTexture(data, side, side, RGBAFormat);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function OpticalLens({ segments }: { segments: number }) {
  return (
    <>
      <mesh>
        <torusGeometry args={[2.35, 0.16, 14, segments]} />
        <meshPhysicalMaterial
          color="#e8f3ff" metalness={0.08} roughness={0.085}
          transmission={0.72} thickness={0.7} ior={1.47}
          clearcoat={1} clearcoatRoughness={0.04}
          transparent opacity={0.7} envMapIntensity={2.2}
          attenuationColor="#ffe6b7" attenuationDistance={3}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <torusGeometry args={[2.35, 0.105, 10, segments]} />
        <meshPhysicalMaterial
          color="#fce3aa" metalness={0.56} roughness={0.16}
          transparent opacity={0.2} envMapIntensity={2.6}
          depthWrite={false}
        />
      </mesh>
      {[2.19, 2.51].map((radius) => (
        <mesh key={radius}>
          <torusGeometry args={[radius, 0.014, 6, segments]} />
          <meshStandardMaterial color="#ffe6ae" metalness={0.66} roughness={0.17} emissive="#e6ac4a" emissiveIntensity={0.2} />
        </mesh>
      ))}
      {[0.18, 3.32].map((angle) => (
        <mesh key={angle} rotation={[0, 0, angle]} position={[0, 0, 0.13]}>
          <torusGeometry args={[2.35, 0.017, 6, Math.max(24, Math.round(segments / 3)), 1.25]} />
          <meshBasicMaterial color="#fff4d7" transparent opacity={0.92} />
        </mesh>
      ))}
    </>
  );
}

function VectorArrow({ end, color, muted = false }: { end: Vector3; color: string; muted?: boolean }) {
  const length = end.length();
  const quaternion = useMemo(() => new Quaternion().setFromUnitVectors(UP, end.clone().normalize()), [end]);
  return (
    <group quaternion={quaternion}>
      <mesh position={[0, length / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, length, 6]} />
        <meshBasicMaterial color={color} transparent opacity={muted ? 0.25 : 0.9} />
      </mesh>
      <mesh position={[0, length, 0]}>
        <coneGeometry args={[0.055, 0.16, 12]} />
        <meshBasicMaterial color={color} transparent opacity={muted ? 0.25 : 1} />
      </mesh>
    </group>
  );
}

function ArrayAperture({ array, hour }: Pick<SunlitSceneProps, "array" | "hour">) {
  const tiltDeg = hour.arrayTiltDeg ?? array.tiltDeg;
  const azimuthDeg = hour.arrayAzimuthDeg ?? array.azimuthDeg;
  const normal = useMemo(() => arrayNormal(tiltDeg, azimuthDeg), [tiltDeg, azimuthDeg]);
  const quaternion = useMemo(() => new Quaternion().setFromUnitVectors(UP, normal), [normal]);
  const sun = useMemo(() => direction(hour.solarAzimuthDeg, hour.solarElevationDeg).multiplyScalar(3), [hour.solarAzimuthDeg, hour.solarElevationDeg]);
  const normalArrow = useMemo(() => normal.clone().multiplyScalar(2.45), [normal]);
  const grid = useMemo(() => {
    const points: number[] = [];
    for (let i = -8; i <= 8; i += 1) points.push(i * 0.2, 0.068, -0.98, i * 0.2, 0.068, 0.98);
    for (let i = -5; i <= 5; i += 1) points.push(-1.64, 0.069, i * 0.19, 1.64, 0.069, i * 0.19);
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
    return geometry;
  }, []);
  useEffect(() => () => grid.dispose(), [grid]);
  return (
    <>
      <group quaternion={quaternion}>
        <mesh>
          <boxGeometry args={[3.43, 0.1, 2.13]} />
          <meshStandardMaterial color="#bdd5e4" metalness={0.85} roughness={0.24} />
        </mesh>
        <mesh position={[0, 0.052, 0]}>
          <boxGeometry args={[3.31, 0.02, 2.01]} />
          <meshPhysicalMaterial color="#124b74" metalness={0.46} roughness={0.2} clearcoat={1} clearcoatRoughness={0.1} envMapIntensity={1.3} />
        </mesh>
        <lineSegments geometry={grid}>
          <lineBasicMaterial color="#a9d6e8" transparent opacity={0.48} />
        </lineSegments>
      </group>
      <group position={[0, 0.11, 0]}>
        <VectorArrow end={sun} color={GOLD} muted={hour.solarElevationDeg <= 0} />
        <VectorArrow end={normalArrow} color={WHITE} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.1, 0]}>
        <ringGeometry args={[2.72, 2.735, 96]} />
        <meshBasicMaterial color="#d5eaff" transparent opacity={0.26} side={2} depthWrite={false} />
      </mesh>
    </>
  );
}

interface FlowRouteProps {
  points: Vec3[];
  value: number;
  color?: string;
}

function FlowRoute({ points, value, color = GOLD }: FlowRouteProps) {
  const active = value > 0.00001;
  const shape = useMemo(() => {
    const vectors = points.map((point) => new Vector3(...point));
    const curve = new CatmullRomCurve3(vectors, false, "catmullrom", 0.08);
    const geometry = new TubeGeometry(curve, 36, active ? 0.022 : 0.009, 6, false);
    const tail = vectors[vectors.length - 1];
    const previous = vectors[vectors.length - 2];
    const rotation = new Quaternion().setFromUnitVectors(UP, tail.clone().sub(previous).normalize());
    return { geometry, tail, rotation };
  }, [points, active]);
  useEffect(() => () => shape.geometry.dispose(), [shape]);
  return (
    <group>
      <mesh geometry={shape.geometry}>
        <meshStandardMaterial color={active ? color : "#dce8ee"} emissive={active ? color : "#000000"} emissiveIntensity={active ? 0.8 : 0} transparent opacity={active ? 0.94 : 0.2} roughness={0.3} />
      </mesh>
      {active && <mesh position={shape.tail} quaternion={shape.rotation}>
        <coneGeometry args={[0.065, 0.15, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>}
    </group>
  );
}

const FLOW_PATHS: Record<string, Vec3[]> = {
  solarToDemand: [[-1.6, 0.86, 0.05], [-1.2, 1.05, 0.05], [1.52, 1.05, 0.05]],
  solarToBattery: [[-1.65, 0.62, 0.05], [-1.13, 0.62, 0.05], [-1.13, 0.1, 0.05], [-0.52, 0.1, 0.05]],
  batteryToDemand: [[0.51, 0.33, 0.05], [0.97, 0.33, 0.05], [0.97, 0.72, 0.05], [1.6, 0.83, 0.05]],
  solarToGrid: [[-1.69, 0.6, 0.05], [-1.34, 0.38, 0.05], [-1.34, -1.65, 0.05], [2, -1.65, 0.05], [2, -1.34, 0.05]],
  gridToDemand: [[2.37, -0.85, 0.05], [2.75, -0.85, 0.05], [2.75, 1.05, 0.05], [2.45, 1.05, 0.05]],
  curtailment: [[-1.95, 0.35, 0.05], [-2.66, -0.2, 0.05], [-2.66, -1.1, 0.05]],
};

function GlassNode({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh scale={[1, 1, 0.23]}>
        <sphereGeometry args={[0.43, 24, 16]} />
        <meshPhysicalMaterial color="#b1d4ef" metalness={0.12} roughness={0.1} transmission={0.55} thickness={0.35} transparent opacity={0.74} clearcoat={1} envMapIntensity={1.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.13]}>
        <torusGeometry args={[0.43, 0.018, 8, 48]} />
        <meshStandardMaterial color="#fff0cf" metalness={0.5} roughness={0.15} emissive="#f4c679" emissiveIntensity={0.28} />
      </mesh>
    </group>
  );
}

function BatteryAllocation({ hour, battery }: Pick<SunlitSceneProps, "hour" | "battery">) {
  const fraction = battery.capacityKWh > 0 ? clamp01(hour.batterySocKWh / battery.capacityKWh) : 0;
  const fillHeight = Math.max(0.003, 1.65 * fraction);
  return (
    <>
      <GlassNode position={[-2.02, 0.82, 0]} />
      <GlassNode position={[2.02, 1.05, 0]} />
      <GlassNode position={[2.02, -0.89, 0]} />
      <group position={[0, -0.1, 0.1]}>
        <mesh>
          <cylinderGeometry args={[0.49, 0.49, 1.96, 40, 1, true]} />
          <meshPhysicalMaterial color="#d9efff" roughness={0.06} transmission={0.8} thickness={0.2} ior={1.45} transparent opacity={0.56} envMapIntensity={1.8} side={2} depthWrite={false} />
        </mesh>
        {[-0.98, 0.98].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.48, 0.035, 10, 48]} />
          <meshStandardMaterial color="#dcefff" metalness={0.72} roughness={0.12} envMapIntensity={1.7} />
        </mesh>)}
        <mesh position={[0, -0.84 + fillHeight / 2, 0]}>
          <cylinderGeometry args={[0.385, 0.385, fillHeight, 40]} />
          <meshPhysicalMaterial color={GOLD} metalness={0.18} roughness={0.12} transmission={0.18} clearcoat={1} emissive="#ffc359" emissiveIntensity={0.3} transparent opacity={0.94} />
        </mesh>
        <mesh position={[0, -0.835 + fillHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.387, 0.014, 6, 40]} />
          <meshBasicMaterial color="#fff1c9" />
        </mesh>
      </group>
      <FlowRoute points={FLOW_PATHS.solarToDemand} value={hour.solarToLoadKWh} />
      <FlowRoute points={FLOW_PATHS.solarToBattery} value={hour.batteryChargeInputKWh} />
      <FlowRoute points={FLOW_PATHS.batteryToDemand} value={hour.batteryDischargeDeliveredKWh} color="#a8f0df" />
      <FlowRoute points={FLOW_PATHS.solarToGrid} value={hour.gridExportKWh} />
      <FlowRoute points={FLOW_PATHS.gridToDemand} value={hour.gridImportKWh} color="#b5defc" />
      {hour.curtailedKWh > 0.00001 && <FlowRoute points={FLOW_PATHS.curtailment} value={hour.curtailedKWh} />}
    </>
  );
}

interface WorldProps extends SunlitSceneProps {
  onProject: (key: LabelKey, x: number, y: number) => void;
  visible: boolean;
  onFailure: () => void;
}

function SunlitWorld({ mode, hour, array, battery, reducedMotion, active = true, quality = "balanced", onProject, visible, onFailure }: WorldProps) {
  const lens = useRef<Group>(null);
  const arrayGroup = useRef<Group>(null);
  const batteryGroup = useRef<Group>(null);
  const sunGroup = useRef<Group>(null);
  const { gl, camera, invalidate, size } = useThree();
  const environment = useMemo(() => studioEnvironment(), []);
  const glow = useMemo(() => glowTexture(), []);
  const sunCore = useMemo(() => glowTexture(true), []);
  const working = useMemo(() => ({ position: new Vector3(), projection: new Vector3() }), []);
  const sunPosition = useMemo(() => direction(hour.solarAzimuthDeg, hour.solarElevationDeg).multiplyScalar(mode === "array" ? 3.5 : 2.1), [hour.solarAzimuthDeg, hour.solarElevationDeg, mode]);
  const tiltDeg = hour.arrayTiltDeg ?? array.tiltDeg;
  const azimuthDeg = hour.arrayAzimuthDeg ?? array.azimuthDeg;
  const normal = useMemo(() => arrayNormal(tiltDeg, azimuthDeg).multiplyScalar(2.65), [tiltDeg, azimuthDeg]);
  const phase = useRef({ array: mode === "array" ? 1 : 0, battery: mode === "battery" ? 1 : 0 });

  useEffect(() => () => { environment.dispose(); glow.dispose(); sunCore.dispose(); }, [environment, glow, sunCore]);

  useEffect(() => {
    const handleLoss = (event: Event) => { event.preventDefault(); onFailure(); };
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", handleLoss);
    return () => canvas.removeEventListener("webglcontextlost", handleLoss);
  }, [gl, onFailure]);

  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    camera.position.set(0, 0.85, aspect < 1.3 ? 10.9 / Math.max(0.7, aspect) : 8.8);
    camera.lookAt(0, 0.1, 0);
    camera.updateProjectionMatrix();
    // HTML labels project before rendering refreshes the camera world matrix.
    camera.updateMatrixWorld();
    invalidate();
  }, [camera, invalidate, size.height, size.width]);

  useEffect(() => { if (active && visible) invalidate(); }, [active, visible, mode, hour.index, array.tiltDeg, array.azimuthDeg, reducedMotion, invalidate]);

  // The single frame owner runs only until the mode/camera change settles.
  useFrame((_, delta) => {
    if (!active || !visible || !lens.current) return;
    const alpha = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 1 / 20) * 8);
    const target = mode === "array"
      ? { x: -0.88, y: -0.2, z: -0.22, sx: 1.06, sy: 0.92 }
      : mode === "battery"
        ? { x: -0.12, y: 0.08, z: 0, sx: 1.32, sy: 0.86 }
        : { x: 0.12, y: -0.45, z: -0.25, sx: 1, sy: 1.08 };
    let remaining = 0;
    const approach = (current: number, destination: number) => {
      remaining += Math.abs(destination - current);
      return Math.abs(destination - current) < 0.0004 ? destination : current + (destination - current) * alpha;
    };
    const ring = lens.current;
    ring.rotation.set(approach(ring.rotation.x, target.x), approach(ring.rotation.y, target.y), approach(ring.rotation.z, target.z));
    ring.scale.set(approach(ring.scale.x, target.sx), approach(ring.scale.y, target.sy), 1);
    phase.current.array = approach(phase.current.array, mode === "array" ? 1 : 0);
    phase.current.battery = approach(phase.current.battery, mode === "battery" ? 1 : 0);
    if (arrayGroup.current) {
      arrayGroup.current.visible = phase.current.array > 0.01;
      arrayGroup.current.scale.setScalar(Math.max(0.001, phase.current.array));
    }
    if (batteryGroup.current) {
      batteryGroup.current.visible = phase.current.battery > 0.01;
      batteryGroup.current.scale.setScalar(Math.max(0.001, phase.current.battery));
    }
    if (sunGroup.current) {
      sunGroup.current.visible = hour.solarElevationDeg > 0 && mode !== "battery";
      sunGroup.current.position.lerp(sunPosition, alpha);
      remaining += sunGroup.current.position.distanceTo(sunPosition);
    }
    const project = (key: LabelKey, point: Vec3 | Vector3, offsetY = 0) => {
      working.position.copy(point instanceof Vector3 ? point : working.projection.set(...point));
      working.position.project(camera);
      const x = Math.max(26, Math.min(size.width - 26, (working.position.x * 0.5 + 0.5) * size.width));
      const y = Math.max(18, Math.min(size.height - 18, (-working.position.y * 0.5 + 0.5) * size.height + offsetY));
      onProject(key, x, y);
    };
    if (mode === "array") {
      project("sun", direction(hour.solarAzimuthDeg, hour.solarElevationDeg).multiplyScalar(3.03), -14);
      project("normal", normal, -12);
    } else if (mode === "battery") {
      project("solar", [-2.02, 0.82, 0.2]);
      project("demand", [2.02, 1.05, 0.2]);
      project("grid", [2.02, -0.89, 0.2]);
      project("battery", [0, -1.2, 0.2], 9);
      project("soc", [0, -0.08, 0.6]);
    }
    if (remaining > 0.002 && !reducedMotion) invalidate();
  });

  return (
    <>
      <primitive object={environment} attach="environment" />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#e3f3ff", "#e7b56b", 2.1]} />
      <directionalLight position={[3, 5, 4]} color="#fff0cb" intensity={3.2} />
      <directionalLight position={[-4, 2, -2]} color="#a7dfff" intensity={2.8} />
      <group ref={lens}><OpticalLens segments={quality === "low" ? 96 : 160} /></group>
      <group ref={arrayGroup} visible={mode === "array"}><ArrayAperture array={array} hour={hour} /></group>
      <group ref={batteryGroup} visible={mode === "battery"}><BatteryAllocation battery={battery} hour={hour} /></group>
      <group ref={sunGroup} position={sunPosition} visible={hour.solarElevationDeg > 0 && mode !== "battery"}>
        <sprite scale={[2.8, 2.8, 1]}>
          <spriteMaterial map={glow as Texture} blending={AdditiveBlending} transparent opacity={0.24} depthWrite={false} toneMapped={false} />
        </sprite>
        <sprite scale={[0.82, 0.82, 1]}>
          <spriteMaterial map={sunCore as Texture} transparent opacity={0.98} depthWrite={false} toneMapped={false} />
        </sprite>
      </group>
    </>
  );
}

function NodeIcon({ type }: { type: "solar" | "demand" | "grid" }) {
  return <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    {type === "solar" ? <><circle cx="16" cy="16" r="6" /><path d="M16 2v5m0 18v5M2 16h5m18 0h5M6 6l4 4m12 12 4 4M6 26l4-4M22 10l4-4" /></> : type === "demand" ? <><path d="M6 29V12h9V4h11v25ZM15 12v17M20 9h2m-2 5h2m-2 5h2m-2 5h2M9 17h3m-3 5h3" /></> : <><path d="m16 3-9 26m9-26 9 26M5 12h22M7 19h18M10 7h12M10 12l12 7-10 7m10-14-12 7 12 7M16 3v4" /></>}
  </svg>;
}

function FallbackScene({ mode, hour, array, battery }: SunlitSceneProps) {
  const id = useId().replace(/:/g, "");
  const tiltDeg = hour.arrayTiltDeg ?? array.tiltDeg;
  const azimuthDeg = hour.arrayAzimuthDeg ?? array.azimuthDeg;
  const normal = arrayNormal(tiltDeg, azimuthDeg);
  const orientation = new Quaternion().setFromUnitVectors(UP, normal);
  const camera = new PerspectiveCamera(39, 900 / 500, 0.1, 50);
  camera.position.set(0, 0.85, 8.8);
  camera.lookAt(0, 0.1, 0);
  camera.updateMatrixWorld();
  const project = (vector: Vector3) => {
    const point = vector.clone().project(camera);
    return [(point.x * 0.5 + 0.5) * 900, (-point.y * 0.5 + 0.5) * 500] as const;
  };
  const aperturePoint = (x: number, z: number) => project(new Vector3(x, 0, z).applyQuaternion(orientation));
  const apertureCorners = [[-1.66,-1.01],[1.66,-1.01],[1.66,1.01],[-1.66,1.01]].map(([x,z]) => aperturePoint(x,z).join(",")).join(" ");
  const origin = project(new Vector3(0, 0.11, 0));
  const normalEnd = project(normal.multiplyScalar(2.45));
  const sunEnd = project(direction(hour.solarAzimuthDeg, hour.solarElevationDeg).multiplyScalar(mode === "overview" ? 2.1 : 3));
  const fraction = battery.capacityKWh > 0 ? clamp01(hour.batterySocKWh / battery.capacityKWh) : 0;
  const solarActive = hour.solarToLoadKWh > 0.00001;
  const exported = hour.gridExportKWh > 0.00001;
  const imported = hour.gridImportKWh > 0.00001;
  return <svg className={styles.fallback} viewBox="0 0 900 500" role="img" aria-label={mode === "overview" ? "Helios solar lens, simplified view" : mode === "array" ? `Array orientation schematic, ${tiltDeg} degree tilt and ${azimuthDeg} degree azimuth` : `Battery energy allocation schematic, ${Math.round(fraction * 100)} percent stored`}>
    <defs>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ecf7ff" stopOpacity=".42" /><stop offset=".35" stopColor="#8bb4d9" stopOpacity=".06" /><stop offset=".65" stopColor="#ffe4a8" stopOpacity=".65" /><stop offset="1" stopColor="#edf8ff" stopOpacity=".2" /></linearGradient>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#a97827" /><stop offset=".55" stopColor="#ffdc83" /><stop offset="1" stopColor="#e5a342" /></linearGradient>
      <radialGradient id={`${id}-sun`}><stop stopColor="#fff9e5" /><stop offset=".22" stopColor="#ffdfa0" stopOpacity=".7" /><stop offset="1" stopColor="#ffcb72" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-sun-core`}><stop offset=".23" stopColor="#fffde7" /><stop offset=".6" stopColor="#ffe2a1" stopOpacity=".7" /><stop offset="1" stopColor="#ffc573" stopOpacity="0" /></radialGradient>
      <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="context-stroke" /></marker>
    </defs>
    <ellipse cx="455" cy="248" rx={mode === "battery" ? 330 : 245} ry={mode === "array" ? 130 : 210} transform={mode === "battery" ? undefined : "rotate(-18 455 248)"} fill="none" stroke={`url(#${id}-glass)`} strokeWidth="18" />
    <ellipse cx="455" cy="248" rx={mode === "battery" ? 340 : 255} ry={mode === "array" ? 140 : 220} transform={mode === "battery" ? undefined : "rotate(-18 455 248)"} fill="none" stroke="#ffe6b6" strokeOpacity=".65" strokeWidth="1.5" />
    {mode === "overview" && hour.solarElevationDeg > 0 && <><circle cx={sunEnd[0]} cy={sunEnd[1]} r="115" fill={`url(#${id}-sun)`} opacity=".45" /><circle cx={sunEnd[0]} cy={sunEnd[1]} r="35" fill={`url(#${id}-sun-core)`} /></>}
    {mode === "array" && <>
      <polygon points={apertureCorners} fill="#155279" stroke="#d1e6ec" strokeWidth="4" />
      {Array.from({ length: 15 }, (_, i) => <path key={`v${i}`} d={`M${aperturePoint(-1.5+i*.2,-1.01).join(" ")}L${aperturePoint(-1.5+i*.2,1.01).join(" ")}`} stroke="#9fc3d7" strokeOpacity=".45" />)}
      {Array.from({ length: 9 }, (_, i) => <path key={`h${i}`} d={`M${aperturePoint(-1.66,-.8+i*.2).join(" ")}L${aperturePoint(1.66,-.8+i*.2).join(" ")}`} stroke="#9fc3d7" strokeOpacity=".45" />)}
      <path d={`M${origin.join(" ")}L${normalEnd.join(" ")}`} fill="none" stroke="#f0fbff" strokeWidth="2" markerEnd={`url(#${id}-arrow)`} />
      <path d={`M${origin.join(" ")}L${sunEnd.join(" ")}`} fill="none" stroke={GOLD} strokeWidth="2" opacity={hour.solarElevationDeg > 0 ? 1 : .35} markerEnd={`url(#${id}-arrow)`} />
      <text x={normalEnd[0]} y={normalEnd[1]-16} textAnchor="middle" fill="#fff">Array normal</text><text x={sunEnd[0]} y={sunEnd[1]-16} textAnchor="middle" fill="#fff">{hour.solarElevationDeg > 0 ? "Sun direction" : "Below horizon"}</text>
    </>}
    {mode === "battery" && <>
      <path d="M272 160H631" stroke={GOLD} strokeWidth={solarActive ? 4 : 1.4} opacity={solarActive ? 1 : .2} />
      <path d="M265 180H332V396H662V321" fill="none" stroke={GOLD} strokeWidth={exported ? 4 : 1.4} opacity={exported ? 1 : .2} />
      <path d="M332 263H406" stroke={GOLD} strokeWidth={hour.batteryChargeInputKWh > 0 ? 4 : 1.4} opacity={hour.batteryChargeInputKWh > 0 ? 1 : .25} />
      <path d="M494 242H566V183H630" fill="none" stroke="#a8f0df" strokeWidth={hour.batteryDischargeDeliveredKWh > 0 ? 4 : 1.4} opacity={hour.batteryDischargeDeliveredKWh > 0 ? 1 : .2} />
      <path d="M696 286H740V160H698" fill="none" stroke="#b5defc" strokeWidth={imported ? 4 : 1.4} opacity={imported ? 1 : .2} />
      {[[240,160,"Solar"],[665,160,"Demand"],[665,285,"Grid"]].map(([x,y,label]) => <g key={label}><circle cx={x} cy={y} r="35" fill={`url(#${id}-glass)`} stroke="#fff0cd" strokeOpacity=".8" /><text x={x} y={Number(y)+60} textAnchor="middle" fill="#fff">{label}</text></g>)}
      <rect x="408" y="157" width="84" height="185" rx="17" fill={`url(#${id}-glass)`} stroke="#e7f3ff" strokeWidth="2" />
      <rect x="417" y={331 - 163 * fraction} width="66" height={Math.max(2,163*fraction)} rx="8" fill={`url(#${id}-gold)`} />
      <text x="450" y="257" textAnchor="middle" fill="#fff" fontSize="24" fontWeight="600">{Math.round(fraction * 100)}%</text><text x="450" y="371" textAnchor="middle" fill="#fff">Battery</text>
    </>}
  </svg>;
}

export default function SunlitScene(props: SunlitSceneProps) {
  const { mode, hour, battery, active = true, quality = "balanced" } = props;
  const supportsWebgl = useSyncExternalStore(noSubscription, webglSnapshot, serverWebgl);
  const visible = useSyncExternalStore(subscribeVisibility, visibilitySnapshot, serverVisibility);
  const [failed, setFailed] = useState(false);
  const labels = useRef<LabelElements>({});
  const fail = useCallback(() => setFailed(true), []);
  const canRender = supportsWebgl && !failed;
  const fraction = battery.capacityKWh > 0 ? clamp01(hour.batterySocKWh / battery.capacityKWh) : 0;
  const projectLabel = useCallback((key: LabelKey, x: number, y: number) => {
    const element = labels.current[key];
    if (element) element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  }, []);
  const created = (state: RootState) => {
    state.gl.setClearColor(0, 0);
    state.gl.setClearAlpha(0);
    state.gl.toneMapping = ACESFilmicToneMapping;
    state.gl.toneMappingExposure = 1.18;
    state.gl.outputColorSpace = SRGBColorSpace;
    state.gl.domElement.setAttribute("aria-hidden", "true");
    state.gl.domElement.tabIndex = -1;
  };
  const labelStyle = { "--scene-label-color": mode === "battery" ? "#fff9eb" : "#f5fbff" } as CSSProperties;

  return <div className={styles.stage} data-sunlit-scene={mode} data-scene-renderer={canRender ? "webgl" : "simplified"} data-scene-night={hour.solarElevationDeg <= 0} style={labelStyle}>
    {canRender ? <SceneBoundary onFailure={fail}>
      <Canvas
        camera={{ position: [0, .85, 8.8], fov: 39, near: .1, far: 50 }}
        frameloop={active && visible ? "demand" : "never"}
        dpr={quality === "low" ? 1 : [1, 1.5]}
        gl={{ alpha: true, antialias: quality !== "low", powerPreference: "low-power" }}
        onCreated={created}
        style={{ pointerEvents: "none", position: "absolute", inset: 0 }}
        aria-hidden="true"
        fallback={<FallbackScene {...props} />}
      >
        <SunlitWorld {...props} onProject={projectLabel} visible={visible} onFailure={fail} />
      </Canvas>
      <div className={styles.labels} aria-hidden="true">
        {mode === "array" && <>
          <span className={styles.vectorLabel} ref={(element) => { labels.current.sun = element; }}>{hour.solarElevationDeg > 0 ? "Sun direction" : "Sun below horizon"}</span>
          <span className={styles.vectorLabel} ref={(element) => { labels.current.normal = element; }}>Array normal</span>
        </>}
        {mode === "battery" && <>
          {(["solar", "demand", "grid"] as const).map((type) => <span key={type} className={styles.nodeLabel} ref={(element) => { labels.current[type] = element; }}><NodeIcon type={type} /><b>{type === "solar" ? "Solar" : type === "demand" ? "Demand" : "Grid"}</b></span>)}
          <span className={styles.batteryLabel} ref={(element) => { labels.current.battery = element; }}>Battery</span>
          <span className={styles.socLabel} ref={(element) => { labels.current.soc = element; }}>{Math.round(fraction * 100)}<small>%</small></span>
        </>}
      </div>
    </SceneBoundary> : <FallbackScene {...props} />}
    <span className={styles.accessible}>{mode === "overview" ? `Solar observation at ${hour.timestampUtc}. Sun elevation ${hour.solarElevationDeg.toFixed(1)} degrees.` : mode === "array" ? `Resolved array orientation: ${hour.arrayTiltDeg ?? props.array.tiltDeg} degree tilt and ${hour.arrayAzimuthDeg ?? props.array.azimuthDeg} degree azimuth. The Sun direction follows the selected hour.` : `Battery contains ${hour.batterySocKWh.toFixed(2)} of ${battery.capacityKWh} kilowatt-hours. Solar generation, load, storage and one grid connection are shown as a logical hourly energy schematic. Exact route values are available in the interface.`}</span>
  </div>;
}
