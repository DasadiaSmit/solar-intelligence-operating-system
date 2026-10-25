export type Vector3Tuple = readonly [x: number, y: number, z: number];

export interface HeliosCameraConfiguration {
  readonly position: Vector3Tuple;
  readonly target: Vector3Tuple;
  readonly fovDeg: number;
  readonly near: number;
  readonly far: number;
}

function frozenVector3(value: Vector3Tuple): Vector3Tuple {
  return Object.freeze([value[0], value[1], value[2]] as const);
}

export const DEFAULT_HELIOS_CAMERA = Object.freeze({
  position: frozenVector3([0, 0, 6]),
  target: frozenVector3([0, 0, 0]),
  fovDeg: 32,
  near: 0.1,
  far: 100,
}) satisfies HeliosCameraConfiguration;

export function isFiniteVector3(value: unknown): value is Vector3Tuple {
  return Array.isArray(value)
    && value.length === 3
    && value.every(
      (coordinate) =>
        typeof coordinate === "number" && Number.isFinite(coordinate),
    );
}

export function sanitizeHeliosCameraConfiguration(
  candidate?: HeliosCameraConfiguration | null,
): HeliosCameraConfiguration {
  if (
    !candidate
    || !isFiniteVector3(candidate.position)
    || !isFiniteVector3(candidate.target)
    || !Number.isFinite(candidate.fovDeg)
    || candidate.fovDeg <= 0
    || candidate.fovDeg >= 180
    || !Number.isFinite(candidate.near)
    || candidate.near <= 0
    || !Number.isFinite(candidate.far)
    || candidate.far <= candidate.near
  ) {
    return DEFAULT_HELIOS_CAMERA;
  }

  const viewDirectionLengthSquared = candidate.position.reduce(
    (sum, coordinate, index) => {
      const delta = coordinate - candidate.target[index];
      return sum + delta * delta;
    },
    0,
  );
  if (
    !Number.isFinite(viewDirectionLengthSquared)
    || viewDirectionLengthSquared <= Number.EPSILON
  ) {
    return DEFAULT_HELIOS_CAMERA;
  }

  return Object.freeze({
    position: frozenVector3(candidate.position),
    target: frozenVector3(candidate.target),
    fovDeg: candidate.fovDeg,
    near: candidate.near,
    far: candidate.far,
  });
}
