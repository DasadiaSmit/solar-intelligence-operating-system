import {
  validBatteryEnergyFlowFrame,
  type BatteryEnergyFlowFrameBuildResult,
  type BatteryEnergyFlowFrameUnavailableReason,
  type BatteryEnergyFlowFrameV1,
} from "./battery-energy-flow-frame";

export type BatteryEnergyFlowNodeId =
  | "pv-source"
  | "distribution-bus"
  | "site-load"
  | "battery-reservoir"
  | "grid-intertie"
  | "curtailment-sink";

export type BatteryEnergyFlowRouteId =
  | "pv-to-load"
  | "pv-to-battery"
  | "battery-to-load"
  | "grid-to-load"
  | "pv-to-grid"
  | "pv-to-curtailment";

export interface BatteryEnergyFlowRouteViewV1 {
  readonly id: BatteryEnergyFlowRouteId;
  readonly label: string;
  readonly from: BatteryEnergyFlowNodeId;
  readonly to: BatteryEnergyFlowNodeId;
  readonly linkedIntervalEnergyKWh: number;
  readonly linkedDayEnergyKWh: number;
  readonly normalizedDayMagnitude: number;
  readonly activeInLinkedInterval: boolean;
  readonly activeInLinkedDay: boolean;
}

export interface BatteryEnergyFlowViewV1
  extends BatteryEnergyFlowFrameV1 {
  readonly spatial: {
    readonly routes: readonly BatteryEnergyFlowRouteViewV1[];
    readonly batteryOperatingBandFill: number;
    readonly magnitudeBasis:
      BatteryEnergyFlowFrameV1["visualEncoding"]["magnitudeBasis"];
  };
}

export type BatteryEnergyFlowViewUnavailableReason =
  | BatteryEnergyFlowFrameUnavailableReason
  | "invalid-battery-energy-flow-frame";

export type BatteryEnergyFlowViewResult =
  | {
      readonly status: "ready";
      readonly view: BatteryEnergyFlowViewV1;
    }
  | {
      readonly status: "unavailable";
      readonly reason: BatteryEnergyFlowViewUnavailableReason;
      readonly summary: string;
    };

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function dayTotal(
  frame: BatteryEnergyFlowFrameV1,
  key:
    | "solarToLoadKWh"
    | "batteryChargeInputKWh"
    | "batteryDischargeDeliveredKWh"
    | "gridImportKWh"
    | "gridExportKWh"
    | "curtailedKWh",
): number {
  return frame.linkedUtcDay.reduce(
    (total, interval) => total + interval[key],
    0,
  );
}

function routeInputs(
  frame: BatteryEnergyFlowFrameV1,
): readonly Omit<
  BatteryEnergyFlowRouteViewV1,
  | "normalizedDayMagnitude"
  | "activeInLinkedInterval"
  | "activeInLinkedDay"
>[] {
  const linked = frame.linkedInterval;
  return [
    {
      id: "pv-to-load",
      label: "PV direct to on-site load",
      from: "pv-source",
      to: "site-load",
      linkedIntervalEnergyKWh: linked.solarToLoadKWh,
      linkedDayEnergyKWh: dayTotal(frame, "solarToLoadKWh"),
    },
    {
      id: "pv-to-battery",
      label: "PV to battery charger input",
      from: "distribution-bus",
      to: "battery-reservoir",
      linkedIntervalEnergyKWh: linked.batteryChargeInputKWh,
      linkedDayEnergyKWh: dayTotal(
        frame,
        "batteryChargeInputKWh",
      ),
    },
    {
      id: "battery-to-load",
      label: "Battery discharge delivered to on-site load",
      from: "battery-reservoir",
      to: "site-load",
      linkedIntervalEnergyKWh:
        linked.batteryDischargeDeliveredKWh,
      linkedDayEnergyKWh: dayTotal(
        frame,
        "batteryDischargeDeliveredKWh",
      ),
    },
    {
      id: "grid-to-load",
      label: "Grid import to on-site load",
      from: "grid-intertie",
      to: "site-load",
      linkedIntervalEnergyKWh: linked.gridImportKWh,
      linkedDayEnergyKWh: dayTotal(frame, "gridImportKWh"),
    },
    {
      id: "pv-to-grid",
      label: "PV export through the grid intertie",
      from: "distribution-bus",
      to: "grid-intertie",
      linkedIntervalEnergyKWh: linked.gridExportKWh,
      linkedDayEnergyKWh: dayTotal(frame, "gridExportKWh"),
    },
    {
      id: "pv-to-curtailment",
      label: "Curtailed PV",
      from: "distribution-bus",
      to: "curtailment-sink",
      linkedIntervalEnergyKWh: linked.curtailedKWh,
      linkedDayEnergyKWh: dayTotal(frame, "curtailedKWh"),
    },
  ] as const;
}

function cloneFrame(
  frame: BatteryEnergyFlowFrameV1,
): BatteryEnergyFlowFrameV1 {
  return {
    ...frame,
    chronology: { ...frame.chronology },
    dispatchBoundary: { ...frame.dispatchBoundary },
    battery: { ...frame.battery },
    linkedInterval: { ...frame.linkedInterval },
    linkedUtcDay: frame.linkedUtcDay.map(
      (interval) => ({ ...interval }),
    ),
    annual: { ...frame.annual },
    units: { ...frame.units },
    visualEncoding: { ...frame.visualEncoding },
    provenance: {
      ...frame.provenance,
      evidenceRefIds: [...frame.provenance.evidenceRefIds],
    },
    unavailableLayers: Object.fromEntries(
      Object.entries(frame.unavailableLayers).map(
        ([key, layer]) => [key, { ...layer }],
      ),
    ) as unknown as BatteryEnergyFlowFrameV1["unavailableLayers"],
  };
}

export function deriveBatteryEnergyFlowView(
  result: BatteryEnergyFlowFrameBuildResult,
): BatteryEnergyFlowViewResult {
  if (result.status === "unavailable") {
    return Object.freeze({ ...result });
  }
  try {
    if (!validBatteryEnergyFlowFrame(result.frame)) {
      return Object.freeze({
        status: "unavailable",
        reason: "invalid-battery-energy-flow-frame",
        summary:
          "The battery energy-flow frame is incomplete or inconsistent; the analytical HTML workspace remains available.",
      });
    }
    const frame = cloneFrame(result.frame);
    const inputs = routeInputs(frame);
    const largestDayEnergyKWh = Math.max(
      0,
      ...inputs.map((route) => route.linkedDayEnergyKWh),
    );
    const routes = inputs.map((route) => ({
      ...route,
      normalizedDayMagnitude: largestDayEnergyKWh > 0
        ? route.linkedDayEnergyKWh / largestDayEnergyKWh
        : 0,
      activeInLinkedInterval:
        route.linkedIntervalEnergyKWh > 1e-8,
      activeInLinkedDay: route.linkedDayEnergyKWh > 1e-8,
    }));
    const operatingBand =
      frame.battery.maximumSocKWh - frame.battery.minimumSocKWh;
    const batteryOperatingBandFill = operatingBand > 0
      ? Math.max(
          0,
          Math.min(
            1,
            (
              frame.linkedInterval.batterySocEndKWh
              - frame.battery.minimumSocKWh
            ) / operatingBand,
          ),
        )
      : 0;
    return Object.freeze({
      status: "ready",
      view: deepFreeze({
        ...frame,
        spatial: {
          routes,
          batteryOperatingBandFill,
          magnitudeBasis: frame.visualEncoding.magnitudeBasis,
        },
      } satisfies BatteryEnergyFlowViewV1),
    });
  } catch {
    return Object.freeze({
      status: "unavailable",
      reason: "invalid-battery-energy-flow-frame",
      summary:
        "The battery energy-flow frame is incomplete or inconsistent; the analytical HTML workspace remains available.",
    });
  }
}
