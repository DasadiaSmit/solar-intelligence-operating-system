import type { WorkspaceId } from "@/lib/mission-intelligence";
import {
  instrumentMountAtPosition,
} from "@/features/visual-computing/observatory-instrument-registry";

export interface ApplicationWorkspaceTarget {
  readonly workspaceId: WorkspaceId;
  readonly selectedIndex: number;
}

export type ApplicationActivationIntent =
  | {
      readonly kind: "open-scenario-controls";
      readonly focusTargetId: "scenario-dc-capacity";
    }
  | {
      readonly kind: "focus-linked-battery-interval";
      readonly focusTargetId: "battery-linked-interval";
    };

/**
 * Renderer-neutral handoff from an experience-layer instrument to the
 * existing analytical application.
 */
export interface ApplicationActivationRequest {
  readonly source:
    | "observatory-instrument-01"
    | "observatory-instrument-02"
    | "observatory-instrument-03"
    | "observatory-instrument-04"
    | "observatory-instrument-05"
    | "observatory-instrument-06";
  readonly requestFocus: boolean;
  readonly intent?: ApplicationActivationIntent;
  readonly target: ApplicationWorkspaceTarget;
}

export type ApplicationActivationInput =
  | boolean
  | ApplicationActivationRequest;

export function activationRequestForObservatoryPosition(
  positionIndex: number,
  selectedIndex: number,
  requestFocus = true,
): ApplicationActivationRequest | null {
  const mount = instrumentMountAtPosition(positionIndex);
  if (
    !Number.isInteger(selectedIndex)
    || selectedIndex < 0
  ) {
    return null;
  }

  const target =
    mount?.instrumentKey === "solar-digital-twin"
      ? {
          source: "observatory-instrument-01" as const,
          workspaceId: "DT" as const,
        }
      : mount?.instrumentKey === "atmospheric-observation"
        ? {
            source: "observatory-instrument-02" as const,
            workspaceId: "WA" as const,
          }
        : mount?.instrumentKey === "annual-energy-observatory"
          ? {
              source: "observatory-instrument-03" as const,
              workspaceId: "AF" as const,
            }
          : mount?.instrumentKey === "solar-array-engineering"
            ? {
                source: "observatory-instrument-04" as const,
                workspaceId: "AE" as const,
                intent: Object.freeze({
                  kind: "open-scenario-controls" as const,
                  focusTargetId: "scenario-dc-capacity" as const,
                }),
              }
            : mount?.instrumentKey === "scenario-comparison"
              ? {
                  source: "observatory-instrument-05" as const,
                  workspaceId: "SR" as const,
                }
              : mount?.instrumentKey === "battery-energy-flow"
                ? {
                    source: "observatory-instrument-06" as const,
                    workspaceId: "BE" as const,
                    intent: Object.freeze({
                      kind: "focus-linked-battery-interval" as const,
                      focusTargetId: "battery-linked-interval" as const,
                    }),
                  }
          : null;
  if (!target) return null;

  return Object.freeze({
    source: target.source,
    requestFocus,
    ...("intent" in target ? { intent: target.intent } : {}),
    target: Object.freeze({
      workspaceId: target.workspaceId,
      selectedIndex,
    }),
  });
}
