"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyScientificMemoryEvent,
  createScientificMemory,
  openScientificInvestigation,
  parseScientificMemory,
  registerMissionArtifact,
  scientificMemoryStorageKey,
  serialiseScientificMemory,
  type MissionArtifactV1,
  type MissionObjectiveV1,
  type ScientificMemoryV1,
} from "@/lib/mission-intelligence";
import { hashMissionValue } from "./context-adapter";

interface ScientificMemoryInputs {
  projectId: string;
  initialTimestampUtc: string;
  scenarioHash: string;
  datasetId: string;
  modelId: string | null;
  baseArtifact: MissionArtifactV1;
}

function safeInitialTimestamp(value: string): string {
  return Number.isFinite(Date.parse(value)) ? value : "1970-01-01T00:00:00.000Z";
}

export function useScientificMemory(inputs: ScientificMemoryInputs) {
  const initialTimestamp = safeInitialTimestamp(inputs.initialTimestampUtc);
  const [memory, setMemory] = useState<ScientificMemoryV1>(() => createScientificMemory(inputs.projectId, initialTimestamp));
  const [loaded, setLoaded] = useState(false);
  const storageKey = useMemo(() => scientificMemoryStorageKey(inputs.projectId), [inputs.projectId]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const stored = window.localStorage.getItem(storageKey);
      const parsed = stored ? parseScientificMemory(stored, inputs.projectId) : null;
      setMemory(parsed ?? createScientificMemory(inputs.projectId, initialTimestamp));
      setLoaded(true);
    });
    return () => { active = false; };
  }, [initialTimestamp, inputs.projectId, storageKey]);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(storageKey, serialiseScientificMemory(memory));
  }, [loaded, memory, storageKey]);

  useEffect(() => {
    if (!loaded) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setMemory((current) => {
        let next = current;
        const timestamp = new Date().toISOString();
        if (!current.artifacts.some((artifact) => artifact.id === inputs.baseArtifact.id)) {
          next = registerMissionArtifact(next, inputs.baseArtifact, `memory:artifact:${inputs.baseArtifact.id}`);
        }
        if (!next.selectedDatasetIds.includes(inputs.datasetId)) {
          next = applyScientificMemoryEvent(next, {
            id: `memory:dataset:${hashMissionValue(inputs.datasetId)}`,
            kind: "dataset-selected",
            occurredAtUtc: timestamp,
            label: `Dataset selected: ${inputs.datasetId}`,
            entityId: inputs.datasetId,
            beforeHash: null,
            afterHash: hashMissionValue(inputs.datasetId),
            evidenceRefIds: [],
            detail: { datasetId: inputs.datasetId },
          });
        }
        if (inputs.modelId && next.selectedModelId !== inputs.modelId) {
          next = applyScientificMemoryEvent(next, {
            id: `memory:model:${hashMissionValue([inputs.modelId, next.revision])}`,
            kind: "model-selected",
            occurredAtUtc: timestamp,
            label: `Model selected: ${inputs.modelId}`,
            entityId: inputs.modelId,
            beforeHash: next.selectedModelId,
            afterHash: hashMissionValue(inputs.modelId),
            evidenceRefIds: [],
            detail: { modelId: inputs.modelId },
          });
        }
        if (next.scenarioHash !== inputs.scenarioHash) {
          next = applyScientificMemoryEvent(next, {
            id: `memory:scenario:${hashMissionValue([inputs.scenarioHash, next.revision])}`,
            kind: "scenario-revised",
            occurredAtUtc: timestamp,
            label: next.scenarioHash ? "Active scenario configuration revised" : "Base scenario configuration registered",
            entityId: "active-scenario",
            beforeHash: next.scenarioHash,
            afterHash: inputs.scenarioHash,
            evidenceRefIds: [],
            detail: { source: "operating-state" },
          });
        }
        return next;
      });
    });
    return () => { active = false; };
  }, [inputs.baseArtifact, inputs.datasetId, inputs.modelId, inputs.scenarioHash, loaded]);

  const openInvestigation = useCallback((objective: MissionObjectiveV1, evidenceRefIds: readonly string[]) => {
    const timestamp = new Date().toISOString();
    const id = `investigation:${hashMissionValue([objective.id, timestamp])}`;
    setMemory((current) => openScientificInvestigation(current, {
      id,
      objective,
      status: "open",
      openedAtUtc: timestamp,
      resolvedAtUtc: null,
      evidenceRefIds,
      unresolvedQuestions: ["Complete the suggested evidence operation and review its scientific boundary."],
    }, `memory:investigation-opened:${id}`));
  }, []);

  const registerArtifact = useCallback((artifact: MissionArtifactV1) => {
    setMemory((current) => registerMissionArtifact(current, artifact, `memory:artifact:${artifact.id}:${current.revision}`));
  }, []);

  const recordAnnotation = useCallback((entityId: string, note: string, evidenceRefIds: readonly string[]) => {
    const timestamp = new Date().toISOString();
    setMemory((current) => applyScientificMemoryEvent(current, {
      id: `memory:annotation:${hashMissionValue([entityId, note, timestamp])}`,
      kind: "annotation-recorded",
      occurredAtUtc: timestamp,
      label: `Scientific annotation · ${entityId}`,
      entityId,
      beforeHash: null,
      afterHash: hashMissionValue(note),
      evidenceRefIds,
      detail: { note, classification: "user-assertion" },
    }));
  }, []);

  return { memory, loaded, openInvestigation, registerArtifact, recordAnnotation };
}
