"use client";

import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { PerspectiveCamera as ThreePerspectiveCamera } from "three";
import {
  DEFAULT_HELIOS_CAMERA,
  type HeliosCameraConfiguration,
} from "./types";

export interface HeliosCameraProps {
  readonly configuration?: HeliosCameraConfiguration;
}

function configurePerspectiveCamera(
  camera: ThreePerspectiveCamera,
  configuration: HeliosCameraConfiguration,
) {
  camera.position.set(...configuration.position);
  camera.up.set(0, 1, 0);
  camera.fov = configuration.fovDeg;
  camera.near = configuration.near;
  camera.far = configuration.far;
  camera.lookAt(...configuration.target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

export function HeliosCamera({
  configuration = DEFAULT_HELIOS_CAMERA,
}: HeliosCameraProps) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const perspectiveCamera = camera as ThreePerspectiveCamera;
    if (!perspectiveCamera.isPerspectiveCamera) return;

    configurePerspectiveCamera(perspectiveCamera, configuration);
    invalidate();
  }, [camera, configuration, invalidate]);

  return null;
}
