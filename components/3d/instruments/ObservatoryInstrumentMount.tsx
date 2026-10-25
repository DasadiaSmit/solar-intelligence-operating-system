"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import type { Group } from "three";
import {
  OBSERVATORY_POSITIONS,
} from "@/features/visual-computing/observatory-model";
import type {
  ObservatoryInstrumentPresentationState,
} from "@/features/visual-computing/observatory-instrument-presentation";
import {
  OBSERVATORY_INSTRUMENT_RING_RADIUS,
} from "../InstrumentRingStructure";
import type {
  ObservatoryInstrumentPresentationHandle,
} from "./types";

const VISIBILITY_EPSILON = 0.0001;

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export interface ObservatoryInstrumentMountProps {
  readonly children: ReactNode;
  readonly positionIndex: number;
  readonly presentation: ObservatoryInstrumentPresentationState;
}

/**
 * A renderer-only mount for one instrument. The mount owns placement and
 * externally driven formation transforms, but no timing, scroll, or science.
 */
export const ObservatoryInstrumentMount = forwardRef<
  ObservatoryInstrumentPresentationHandle,
  ObservatoryInstrumentMountProps
>(function ObservatoryInstrumentMount(
  {
    children,
    positionIndex,
    presentation,
  },
  ref,
) {
  const presentationGroupRef = useRef<Group>(null);
  const presentationSeededRef = useRef(false);
  const position = OBSERVATORY_POSITIONS[positionIndex];

  const applyPresentation = useCallback(
    (next: ObservatoryInstrumentPresentationState) => {
      const group = presentationGroupRef.current;
      if (!group) return;

      const visibility = clampUnit(next.visibility);
      const formation = clampUnit(next.formationProgress);
      const emergence = visibility * (0.78 + formation * 0.22);

      group.visible = visibility > VISIBILITY_EPSILON;
      group.position.z = -0.18 * (1 - formation);
      group.scale.setScalar(Math.max(VISIBILITY_EPSILON, emergence));
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({ applyPresentation }),
    [applyPresentation],
  );

  useLayoutEffect(() => {
    if (presentationSeededRef.current) return;
    presentationSeededRef.current = true;
    applyPresentation(presentation);
  }, [applyPresentation, presentation]);

  if (!position) return null;

  return (
    <group
      name={`observatory-instrument-mount:${position.id}`}
      position={[
        Math.cos(position.angleRadians)
          * OBSERVATORY_INSTRUMENT_RING_RADIUS,
        Math.sin(position.angleRadians)
          * OBSERVATORY_INSTRUMENT_RING_RADIUS,
        0,
      ]}
      rotation={[0, 0, position.angleRadians - Math.PI / 2]}
      userData={{
        positionId: position.id,
        positionIndex: position.index,
        positionOrdinal: position.ordinal,
        presentationDriven: true,
      }}
    >
      <group
        ref={presentationGroupRef}
        name={`observatory-instrument-presentation:${position.id}`}
      >
        {children}
      </group>
    </group>
  );
});
