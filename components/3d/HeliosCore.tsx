import {
  forwardRef,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  InstancedMesh,
  Object3D,
  type Group,
} from "three";
import { HELIOS_RING_SPECS } from "@/features/visual-computing/helios-hero-model";
import type { VisualQualityTier } from "@/features/visual-computing/renderer-policy";

export interface HeliosCoreProps {
  readonly visible?: boolean;
  readonly qualityTier?: VisualQualityTier;
}

const MAX_MARKER_COUNT = 8;

function RingMarkers({
  radius,
  qualityTier,
}: {
  readonly radius: number;
  readonly qualityTier: VisualQualityTier;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const marker = useMemo(() => new Object3D(), []);
  const markerCount =
    qualityTier === "scientific"
      ? 4
      : qualityTier === "balanced"
        ? 6
        : MAX_MARKER_COUNT;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let index = 0; index < markerCount; index += 1) {
      const angle = (index / markerCount) * Math.PI * 2;
      marker.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0,
      );
      marker.rotation.set(0, 0, angle);
      marker.scale.setScalar(index % 2 === 0 ? 1 : 0.62);
      marker.updateMatrix();
      mesh.setMatrixAt(index, marker.matrix);
    }
    mesh.count = markerCount;
    mesh.instanceMatrix.needsUpdate = true;
  }, [marker, markerCount, radius]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_MARKER_COUNT]}
      name="helios-engraved-index-marks"
      renderOrder={40}
    >
      <boxGeometry args={[0.085, 0.018, 0.018]} />
      <meshStandardMaterial
        color="#2b2d27"
        emissive="#76643a"
        emissiveIntensity={0.08}
        metalness={0.72}
        roughness={0.4}
      />
    </instancedMesh>
  );
}

/**
 * Six stable subsystem rings form the non-scientific operating-system core.
 * Motion is owned by the parent scene coordinator so the rings never create
 * independent render loops.
 */
export const HeliosCore = forwardRef<Group, HeliosCoreProps>(
  function HeliosCore(
    { visible = true, qualityTier = "balanced" },
    ref,
  ) {
    if (!visible) return null;
    const radialSegments =
      qualityTier === "scientific"
        ? 4
        : qualityTier === "balanced"
          ? 5
          : 6;
    const tubularSegments =
      qualityTier === "scientific"
        ? 48
        : qualityTier === "balanced"
          ? 72
          : 96;
    return (
      <group ref={ref} name="helios-core">
        {HELIOS_RING_SPECS.map((ring, index) => (
          <group
            key={ring.id}
            name={`helios-ring:${ring.id}`}
            rotation={[...ring.inclination]}
            userData={{
              subsystem: ring.id,
              periodSeconds: ring.periodSeconds,
              direction: ring.direction,
            }}
          >
            <mesh renderOrder={10 + index}>
              <torusGeometry
                args={[
                  ring.radius,
                  ring.tubeRadius,
                  radialSegments,
                  tubularSegments,
                ]}
              />
              <meshStandardMaterial
                color={ring.colour}
                depthWrite={false}
                emissive={ring.colour}
                emissiveIntensity={0.06}
                metalness={0.78}
                opacity={ring.opacity}
                roughness={0.34}
                transparent
              />
            </mesh>
            <RingMarkers
              radius={ring.radius}
              qualityTier={qualityTier}
            />
          </group>
        ))}
      </group>
    );
  },
);
