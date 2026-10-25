import {
  clamp,
  normalizeSnapshot,
  recordOf,
  resultForScenario,
  type OperatingSnapshotInput,
} from "@/components/solar-os/model";
import { buildSceneFrameV1 } from "./build-scene-frame";
import type {
  SceneFrameBuildResult,
  SceneLifecycle,
} from "./scene-frame";

export const HERO_LINKED_HOUR_INDEX = 171 * 24 + 12;

function lifecycleFor(
  snapshotMode: string,
  deterministic: boolean,
): SceneLifecycle {
  return deterministic || /sample|simulat|deterministic/i.test(snapshotMode)
    ? "SIMULATED"
    : "IMPLEMENTED";
}

/**
 * Adapts the same compact operating snapshot used by the analytical shell.
 * The Hero never owns or mutates the linked operating time.
 */
export function buildRepresentativeHeroScene(
  snapshot: OperatingSnapshotInput,
): SceneFrameBuildResult {
  const base = normalizeSnapshot(snapshot);
  const raw = snapshot as unknown as Record<string, unknown>;
  const status = recordOf(raw.status);
  const result = resultForScenario(base, base.config);
  const selectedIndex = clamp(
    HERO_LINKED_HOUR_INDEX,
    0,
    Math.max(0, result.hours.length - 1),
  );
  return buildSceneFrameV1({
    base,
    result,
    scenario: base.config,
    selectedIndex,
    lifecycle: lifecycleFor(base.mode, status.deterministic === true),
  });
}
