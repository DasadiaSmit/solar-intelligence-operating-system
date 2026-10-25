import {
  Suspense,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
  type Ref,
} from "react";
import type { Group } from "three";
import {
  OBSERVATORY_RING_STEP_RADIANS,
} from "@/features/visual-computing/observatory-model";
import {
  OBSERVATORY_INSTRUMENT_MOUNTS,
  type ObservatoryInstrumentKey,
} from "@/features/visual-computing/observatory-instrument-registry";
import type {
  ObservatoryInstrumentPresentationState,
} from "@/features/visual-computing/observatory-instrument-presentation";
import type { VisualQualityTier } from "@/features/visual-computing/renderer-policy";
import {
  InstrumentRingStructure,
  OBSERVATORY_INSTRUMENT_RING_RADIUS,
} from "./InstrumentRingStructure";
import {
  AnnualEnergyInstrument,
  ArrayEngineeringInstrument,
  AtmosphericObservationInstrument,
  ObservatoryInstrumentMount,
  SolarDigitalTwinInstrument,
  type AnnualEnergyInstrumentHandle,
  type LazyBatteryEnergyFlowInstrument,
  type ObservatoryInstrumentManagerHandle,
  type ObservatoryInstrumentPresentations,
  type ObservatoryInstrumentPresentationHandle,
  type ObservatoryInstrumentViews,
  type LazyScenarioComparisonInstrument,
} from "./instruments";

const MOUNTED_INSTRUMENTS = OBSERVATORY_INSTRUMENT_MOUNTS.filter(
  (mount) => mount.mountStatus === "mounted" && mount.instrumentKey,
);
const EMPTY_INSTRUMENT_MOUNTS = OBSERVATORY_INSTRUMENT_MOUNTS.filter(
  (mount) => mount.mountStatus !== "mounted",
);
function instrumentContent(
  key: ObservatoryInstrumentKey,
  qualityTier: VisualQualityTier,
  views: ObservatoryInstrumentViews,
  presentation: ObservatoryInstrumentPresentationState,
  annualEnergyHandle: Ref<AnnualEnergyInstrumentHandle>,
  ScenarioComparisonInstrument:
    LazyScenarioComparisonInstrument,
  BatteryEnergyFlowInstrument:
    LazyBatteryEnergyFlowInstrument,
): ReactNode {
  if (key === "solar-digital-twin") {
    const result = views["solar-digital-twin"];
    return result?.status === "ready" ? (
      <SolarDigitalTwinInstrument
        qualityTier={qualityTier}
        view={result.view}
      />
    ) : null;
  }
  if (key === "atmospheric-observation") {
    const result = views["atmospheric-observation"];
    return result?.status === "ready" ? (
      <AtmosphericObservationInstrument
        qualityTier={qualityTier}
        view={result.view}
      />
    ) : null;
  }
  if (key === "annual-energy-observatory") {
    const result = views["annual-energy-observatory"];
    return result?.status === "ready" ? (
      <AnnualEnergyInstrument
        ref={annualEnergyHandle}
        qualityTier={qualityTier}
        view={result.view}
      />
    ) : null;
  }
  if (key === "solar-array-engineering") {
    const result = views["solar-array-engineering"];
    return result?.status === "ready" ? (
      <ArrayEngineeringInstrument
        qualityTier={qualityTier}
        view={result.view}
      />
    ) : null;
  }
  if (key === "scenario-comparison") {
    const result = views["scenario-comparison"];
    return result?.status === "ready"
      && presentation.presence !== "absent" ? (
        <Suspense fallback={null}>
          <ScenarioComparisonInstrument
            qualityTier={qualityTier}
            result={result}
          />
        </Suspense>
      ) : null;
  }
  if (key === "battery-energy-flow") {
    const result = views["battery-energy-flow"];
    return result?.status === "ready"
      && presentation.presence !== "absent" ? (
        <Suspense fallback={null}>
          <BatteryEnergyFlowInstrument
            qualityTier={qualityTier}
            result={result}
          />
        </Suspense>
      ) : null;
  }
  return null;
}

export interface ObservatoryInstrumentManagerProps {
  readonly activePositionIndex?: number;
  readonly visibility?: number;
  readonly qualityTier?: VisualQualityTier;
  readonly presentations?: ObservatoryInstrumentPresentations;
  readonly scenarioComparisonInstrument:
    LazyScenarioComparisonInstrument;
  readonly batteryEnergyFlowInstrument:
    LazyBatteryEnergyFlowInstrument;
  readonly views?: ObservatoryInstrumentViews;
}

/**
 * Persistent transform boundary for the Observatory dial. Mounted render
 * entries come only from the immutable registry; the scene coordinator drives
 * the dial and every child mount through one aggregate imperative handle.
 */
export const ObservatoryInstrumentManager = forwardRef<
  ObservatoryInstrumentManagerHandle,
  ObservatoryInstrumentManagerProps
>(function ObservatoryInstrumentManager(
  {
    activePositionIndex = 0,
    visibility = 1,
    qualityTier = "balanced",
    presentations = {},
    batteryEnergyFlowInstrument,
    scenarioComparisonInstrument,
    views = {},
  },
  ref,
) {
  const groupRef = useRef<Group>(null);
  const annualEnergyHandleRef =
    useRef<AnnualEnergyInstrumentHandle>(null);
  const instrumentHandles = useRef(
    new Map<number, ObservatoryInstrumentPresentationHandle>(),
  );
  const mountRefCallbacks = useMemo(() => {
    const callbacks = new Map<
      number,
      (handle: ObservatoryInstrumentPresentationHandle | null) => void
    >();
    for (const mount of MOUNTED_INSTRUMENTS) {
      callbacks.set(mount.position.index, (handle) => {
        if (handle) {
          instrumentHandles.current.set(mount.position.index, handle);
        } else {
          instrumentHandles.current.delete(mount.position.index);
        }
      });
    }
    return callbacks;
  }, []);
  const applyPresentation = useCallback<
    ObservatoryInstrumentManagerHandle["applyPresentation"]
  >((dialRotationRad, nextPresentations) => {
    const group = groupRef.current;
    if (group) {
      group.rotation.z = Number.isFinite(dialRotationRad)
        ? dialRotationRad
        : 0;
    }
    for (const presentation of nextPresentations) {
      instrumentHandles.current
        .get(presentation.mount.position.index)
        ?.applyPresentation(presentation);
      if (
        presentation.mount.instrumentKey
          === "annual-energy-observatory"
      ) {
        annualEnergyHandleRef.current?.applyPresentation(presentation);
      }
    }
  }, []);
  useImperativeHandle(
    ref,
    () => ({ applyPresentation }),
    [applyPresentation],
  );

  const visible =
    Number.isFinite(visibility) && visibility > 0;
  const mountedInstrumentCount = MOUNTED_INSTRUMENTS.filter((mount) => {
    const key = mount.instrumentKey;
    return key
      && presentations[key] !== undefined
      && views[key]?.status === "ready";
  }).length;

  return (
    <group
      ref={groupRef}
      name="observatory-instrument-manager"
      visible={visible}
      userData={{
        implementedInstrumentCount: MOUNTED_INSTRUMENTS.length,
        mountedInstrumentCount,
        placeholderOnly: false,
        positionCount: OBSERVATORY_INSTRUMENT_MOUNTS.length,
        ringStepRadians: OBSERVATORY_RING_STEP_RADIANS,
        representation: "observatory-instrument-framework",
      }}
    >
      <InstrumentRingStructure
        activePositionIndex={activePositionIndex}
        visibility={visibility}
        qualityTier={qualityTier}
      />

      {MOUNTED_INSTRUMENTS.map((mount) => {
        const key = mount.instrumentKey;
        if (!key) return null;
        const presentation = presentations[key];
        if (!presentation) return null;
        const instrument = instrumentContent(
          key,
          qualityTier,
          views,
          presentation,
          annualEnergyHandleRef,
          scenarioComparisonInstrument,
          batteryEnergyFlowInstrument,
        );
        if (!instrument) return null;

        return (
          <ObservatoryInstrumentMount
            key={mount.instrumentId}
            ref={mountRefCallbacks.get(mount.position.index)}
            positionIndex={mount.position.index}
            presentation={presentation}
          >
            {instrument}
          </ObservatoryInstrumentMount>
        );
      })}

      <group
        name="observatory-empty-instrument-anchors"
        userData={{
          containsSpatialInstruments: false,
          positionCount: EMPTY_INSTRUMENT_MOUNTS.length,
        }}
      >
        {EMPTY_INSTRUMENT_MOUNTS.map((mount) => {
          const { position } = mount;
          return (
            <group
              key={position.id}
              name={`observatory-empty-anchor:${position.id}`}
              position={[
                Math.cos(position.angleRadians)
                  * OBSERVATORY_INSTRUMENT_RING_RADIUS,
                Math.sin(position.angleRadians)
                  * OBSERVATORY_INSTRUMENT_RING_RADIUS,
                0,
              ]}
              rotation={[0, 0, position.angleRadians - Math.PI / 2]}
              userData={{
                placeholderOnly: mount.mountStatus === "placeholder",
                positionId: position.id,
                positionIndex: position.index,
                positionOrdinal: position.ordinal,
                availability: position.availability,
                mountStatus: mount.mountStatus,
              }}
            />
          );
        })}
      </group>
    </group>
  );
});
