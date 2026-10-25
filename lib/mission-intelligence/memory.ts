import {
  SCIENTIFIC_MEMORY_VERSION,
  type MissionArtifactV1,
  type MissionContinuityAlertV1,
  type MissionDependencyFingerprintV1,
  type ScientificInvestigationV1,
  type ScientificMemoryEventV1,
  type ScientificMemoryV1,
} from "./contracts";

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function updated(memory: ScientificMemoryV1, updatedAtUtc: string): ScientificMemoryV1 {
  return { ...memory, revision: memory.revision + 1, updatedAtUtc };
}

export function scientificMemoryStorageKey(projectId: string): string {
  return `sios.mission-memory.${encodeURIComponent(projectId)}.${SCIENTIFIC_MEMORY_VERSION}`;
}

export function createScientificMemory(projectId: string, createdAtUtc: string): ScientificMemoryV1 {
  if (!projectId.trim()) throw new Error("Scientific memory requires a project ID.");
  if (!Number.isFinite(Date.parse(createdAtUtc))) throw new Error("Scientific memory requires an ISO timestamp.");
  return {
    schemaVersion: SCIENTIFIC_MEMORY_VERSION,
    projectId,
    revision: 0,
    updatedAtUtc: createdAtUtc,
    selectedDatasetIds: [],
    selectedModelId: null,
    scenarioHash: null,
    assumptions: [],
    artifacts: [],
    investigations: [],
    events: [],
  };
}

/** Applies a scientific-state event immutably; it never stores conversation messages. */
export function applyScientificMemoryEvent(
  memory: ScientificMemoryV1,
  event: ScientificMemoryEventV1,
): ScientificMemoryV1 {
  if (memory.events.some((item) => item.id === event.id)) return memory;
  let next: ScientificMemoryV1 = updated(memory, event.occurredAtUtc);
  if (event.kind === "scenario-revised") next = { ...next, scenarioHash: event.afterHash };
  if (event.kind === "dataset-selected" && typeof event.detail.datasetId === "string") {
    next = { ...next, selectedDatasetIds: unique([...next.selectedDatasetIds, event.detail.datasetId]) };
  }
  if (event.kind === "model-selected" && typeof event.detail.modelId === "string") {
    next = { ...next, selectedModelId: event.detail.modelId };
  }
  if (event.kind === "assumption-recorded" && typeof event.detail.assumption === "string") {
    next = { ...next, assumptions: unique([...next.assumptions, event.detail.assumption]) };
  }
  return { ...next, events: [...next.events, event] };
}

export function registerMissionArtifact(
  memory: ScientificMemoryV1,
  artifact: MissionArtifactV1,
  eventId: string,
): ScientificMemoryV1 {
  const existing = memory.artifacts.find((item) => item.id === artifact.id);
  const artifacts = existing
    ? memory.artifacts.map((item) => item.id === artifact.id ? artifact : item)
    : [...memory.artifacts, artifact];
  const next = updated({ ...memory, artifacts }, artifact.registeredAtUtc);
  if (next.events.some((event) => event.id === eventId)) return next;
  const event: ScientificMemoryEventV1 = {
    id: eventId,
    kind: "artifact-registered",
    occurredAtUtc: artifact.registeredAtUtc,
    label: artifact.label,
    entityId: artifact.id,
    beforeHash: existing?.resultId ?? null,
    afterHash: artifact.resultId,
    evidenceRefIds: artifact.evidenceRefIds,
    detail: { artifactKind: artifact.kind },
  };
  return { ...next, events: [...next.events, event] };
}

export function openScientificInvestigation(
  memory: ScientificMemoryV1,
  investigation: ScientificInvestigationV1,
  eventId: string,
): ScientificMemoryV1 {
  if (memory.investigations.some((item) => item.id === investigation.id)) return memory;
  const next = updated(
    { ...memory, investigations: [...memory.investigations, investigation] },
    investigation.openedAtUtc,
  );
  const event: ScientificMemoryEventV1 = {
    id: eventId,
    kind: "investigation-opened",
    occurredAtUtc: investigation.openedAtUtc,
    label: investigation.objective.label,
    entityId: investigation.id,
    beforeHash: null,
    afterHash: investigation.objective.id,
    evidenceRefIds: investigation.evidenceRefIds,
    detail: { objectiveIntent: investigation.objective.intent },
  };
  return { ...next, events: [...next.events, event] };
}

export function resolveScientificInvestigation(
  memory: ScientificMemoryV1,
  investigationId: string,
  resolvedAtUtc: string,
  eventId: string,
): ScientificMemoryV1 {
  const current = memory.investigations.find((item) => item.id === investigationId);
  if (!current || current.status === "resolved") return memory;
  const investigations = memory.investigations.map((item) => item.id === investigationId
    ? { ...item, status: "resolved" as const, resolvedAtUtc, unresolvedQuestions: [] }
    : item);
  const next = updated({ ...memory, investigations }, resolvedAtUtc);
  const event: ScientificMemoryEventV1 = {
    id: eventId,
    kind: "investigation-resolved",
    occurredAtUtc: resolvedAtUtc,
    label: current.objective.label,
    entityId: investigationId,
    beforeHash: current.objective.id,
    afterHash: current.objective.id,
    evidenceRefIds: current.evidenceRefIds,
    detail: { objectiveIntent: current.objective.intent },
  };
  return { ...next, events: [...next.events, event] };
}

/**
 * Finds artifacts whose recorded input fingerprints no longer match current
 * scientific state. No artifact is mutated or automatically recomputed.
 */
export function detectContinuityAlerts(
  artifacts: readonly MissionArtifactV1[],
  currentDependencies: readonly MissionDependencyFingerprintV1[],
): MissionContinuityAlertV1[] {
  const current = new Map(currentDependencies.map((dependency) => [dependency.key, dependency]));
  return artifacts.flatMap((artifact) => {
    const changed = artifact.dependencies.flatMap((dependency) => {
      const currentDependency = current.get(dependency.key);
      if (currentDependency?.valueHash === dependency.valueHash) return [];
      return [{
        key: dependency.key,
        label: dependency.label,
        artifactValueHash: dependency.valueHash,
        currentValueHash: currentDependency?.valueHash ?? null,
      }];
    });
    if (!changed.length) return [];
    return [{
      id: `continuity:${artifact.id}:${changed.map((item) => item.key).sort().join("+")}`,
      severity: "warning" as const,
      artifactId: artifact.id,
      message: `${artifact.label} uses earlier ${changed.map((item) => item.label).join(", ")} state. Recompute before comparison.`,
      changedDependencies: changed,
      evidenceRefIds: artifact.evidenceRefIds,
    }];
  });
}

export function serialiseScientificMemory(memory: ScientificMemoryV1): string {
  return JSON.stringify(memory);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Parses device-local memory fail-closed; incompatible or malformed data returns null. */
export function parseScientificMemory(
  serialised: string,
  expectedProjectId: string,
): ScientificMemoryV1 | null {
  try {
    const value: unknown = JSON.parse(serialised);
    if (!isRecord(value)) return null;
    if (value.schemaVersion !== SCIENTIFIC_MEMORY_VERSION || value.projectId !== expectedProjectId) return null;
    if (!Number.isInteger(value.revision) || (value.revision as number) < 0) return null;
    if (typeof value.updatedAtUtc !== "string" || !Number.isFinite(Date.parse(value.updatedAtUtc))) return null;
    if (!Array.isArray(value.selectedDatasetIds) || !value.selectedDatasetIds.every((item) => typeof item === "string")) return null;
    if (value.selectedModelId !== null && typeof value.selectedModelId !== "string") return null;
    if (value.scenarioHash !== null && typeof value.scenarioHash !== "string") return null;
    if (!Array.isArray(value.assumptions) || !value.assumptions.every((item) => typeof item === "string")) return null;
    if (!Array.isArray(value.artifacts) || !Array.isArray(value.investigations) || !Array.isArray(value.events)) return null;
    return value as unknown as ScientificMemoryV1;
  } catch {
    return null;
  }
}
