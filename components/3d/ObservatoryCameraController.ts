import { gsap } from "gsap";
import {
  type PerspectiveCamera,
  type Vector3,
} from "three";
import {
  HERO_CAMERA_FINAL,
  HERO_CAMERA_INITIAL,
  type HeroCameraPose,
} from "@/features/visual-computing/hero-motion";
import {
  deriveObservatoryCameraPose,
} from "@/features/visual-computing/observatory-motion";
import type {
  ObservatoryPresentationState,
} from "@/features/visual-computing/observatory-model";

export interface ObservatoryCameraPointerOffset {
  readonly x: number;
  readonly y: number;
}

/**
 * Owns the one paused, scroll-scrubbed camera timeline used by the continuous
 * Observatory. It mutates presentation state only; it never owns navigation,
 * scientific state, or a render loop.
 */
export class ObservatoryCameraController {
  readonly #pose: HeroCameraPose;
  readonly #heroTimeline: gsap.core.Timeline;

  constructor() {
    this.#pose = { ...HERO_CAMERA_INITIAL };
    this.#heroTimeline = gsap.timeline({ paused: true });
    this.#heroTimeline.to(
      this.#pose,
      {
        ...HERO_CAMERA_FINAL,
        duration: 1,
        ease: "power2.inOut",
      },
      0,
    );
  }

  seek(
    presentation: ObservatoryPresentationState,
    reducedMotion: boolean,
  ): void {
    if (presentation.phase === "hero") {
      this.#heroTimeline.progress(
        reducedMotion ? 0 : presentation.heroProgress,
        false,
      );
      return;
    }

    this.#heroTimeline.progress(1, false);
    Object.assign(
      this.#pose,
      deriveObservatoryCameraPose(
        presentation.progress,
        reducedMotion,
      ),
    );
  }

  apply(
    camera: PerspectiveCamera,
    lookAtTarget: Vector3,
    pointer: ObservatoryCameraPointerOffset,
    pointerInfluence: number,
  ): void {
    const influence = Math.max(0, Math.min(1, pointerInfluence));
    camera.position.set(
      this.#pose.x + pointer.x * 0.14 * influence,
      this.#pose.y + pointer.y * 0.09 * influence,
      this.#pose.z,
    );
    lookAtTarget.set(
      this.#pose.targetX + pointer.x * 0.035 * influence,
      this.#pose.targetY + pointer.y * 0.025 * influence,
      this.#pose.targetZ,
    );
    camera.lookAt(lookAtTarget);

    if (Math.abs(camera.fov - this.#pose.fov) > 0.001) {
      camera.fov = this.#pose.fov;
      camera.updateProjectionMatrix();
    }
  }

  dispose(): void {
    this.#heroTimeline.kill();
  }
}
