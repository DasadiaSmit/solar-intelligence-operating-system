import {
  validScenarioComparisonFrame,
  type ScenarioComparisonFrameBuildResult,
  type ScenarioComparisonFrameUnavailableReason,
  type ScenarioComparisonFrameV1,
} from "./scenario-comparison-frame";

export type ScenarioComparisonViewV1 = ScenarioComparisonFrameV1;

export type ScenarioComparisonViewUnavailableReason =
  | ScenarioComparisonFrameUnavailableReason
  | "invalid-scenario-comparison-frame";

export type ScenarioComparisonViewResult =
  | {
      readonly status: "ready";
      readonly view: ScenarioComparisonViewV1;
    }
  | {
      readonly status: "unavailable";
      readonly reason: ScenarioComparisonViewUnavailableReason;
      readonly summary: string;
    };

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function cloneFrame(
  frame: ScenarioComparisonFrameV1,
): ScenarioComparisonViewV1 {
  return deepFreeze({
    ...frame,
    comparisonBoundary: { ...frame.comparisonBoundary },
    chronology: { ...frame.chronology },
    metricDefinitions: { ...frame.metricDefinitions },
    optimisation: { ...frame.optimisation },
    chambers: frame.chambers.map((chamber) => ({
      ...chamber,
      evidenceRefIds: [...chamber.evidenceRefIds],
    })),
    visualEncoding: {
      ...frame.visualEncoding,
      responseRange: [...frame.visualEncoding.responseRange],
    },
    provenance: {
      ...frame.provenance,
      evidenceRefIds: [...frame.provenance.evidenceRefIds],
    },
    unavailableLayers: Object.fromEntries(
      Object.entries(frame.unavailableLayers).map(
        ([key, layer]) => [key, { ...layer }],
      ),
    ) as unknown as ScenarioComparisonFrameV1["unavailableLayers"],
  } satisfies ScenarioComparisonViewV1);
}

export function deriveScenarioComparisonView(
  result: ScenarioComparisonFrameBuildResult,
): ScenarioComparisonViewResult {
  if (result.status === "unavailable") {
    return Object.freeze({ ...result });
  }
  try {
    if (!validScenarioComparisonFrame(result.frame)) {
      return Object.freeze({
        status: "unavailable",
        reason: "invalid-scenario-comparison-frame",
        summary:
          "The scenario comparison frame is incomplete or inconsistent; the analytical HTML workspace remains authoritative.",
      });
    }
    return Object.freeze({
      status: "ready",
      view: cloneFrame(result.frame),
    });
  } catch {
    return Object.freeze({
      status: "unavailable",
      reason: "invalid-scenario-comparison-frame",
      summary:
        "The scenario comparison frame is incomplete or inconsistent; the analytical HTML workspace remains authoritative.",
    });
  }
}
