import { reproducibleId } from "@/lib/provenance";
import { ProviderError } from "@/lib/providers";
import { runtimeActorEmail } from "../_shared";

export interface ScenarioInput {
  name: string;
  description: string;
  lifecycle: "implemented" | "experimental" | "simulated" | "planned";
  siteId: string | null;
  baseConfigurationId: string | null;
  branchFromScenarioId: string | null;
  inputs: Record<string, unknown>;
  tags: string[];
}

export const BUILT_IN_SCENARIOS = [
  {
    id: "builtin_cloud_event",
    name: "Three-day Atlantic cloud event",
    description: "A deterministic stress preset; no observed event or production result is implied.",
    lifecycle: "simulated",
    inputs: { weatherScenario: "cloudy", durationHours: 72 },
    tags: ["weather", "stress-test"],
    persisted: false,
    source: "built-in-preset",
  },
  {
    id: "builtin_grid_interruption",
    name: "Evening grid interruption",
    description: "A parameter preset for battery-resilience analysis, not an outage forecast.",
    lifecycle: "simulated",
    inputs: { gridAvailable: false, startHour: 17, durationHours: 6 },
    tags: ["grid", "resilience"],
    persisted: false,
    source: "built-in-preset",
  },
] as const;

export async function actorId(request: Request): Promise<string | null> {
  const email = runtimeActorEmail(request);
  return email ? reproducibleId("usr", email) : null;
}

export function validateScenarioInput(value: unknown, partial = false): Partial<ScenarioInput> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("Scenario body must be an object.");
  const source = value as Record<string, unknown>;
  const result: Partial<ScenarioInput> = {};
  if (!partial || source.name !== undefined) result.name = text(source.name, "name", 120);
  if (source.description !== undefined) result.description = text(source.description, "description", 2_000, true);
  else if (!partial) result.description = "";
  if (source.lifecycle !== undefined) {
    if (!["implemented", "experimental", "simulated", "planned"].includes(String(source.lifecycle))) {
      invalid("lifecycle must be implemented, experimental, simulated or planned.");
    }
    result.lifecycle = source.lifecycle as ScenarioInput["lifecycle"];
  } else if (!partial) result.lifecycle = "experimental";
  for (const key of ["siteId", "baseConfigurationId", "branchFromScenarioId"] as const) {
    if (source[key] !== undefined) result[key] = nullableId(source[key], key);
    else if (!partial) result[key] = null;
  }
  if (!partial || source.inputs !== undefined) result.inputs = jsonObject(source.inputs ?? {}, "inputs");
  if (source.tags !== undefined) result.tags = tags(source.tags);
  else if (!partial) result.tags = [];
  return result;
}

function jsonObject(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(`${name} must be an object.`);
  const encoded = JSON.stringify(value);
  if (encoded.length > 65_536) invalid(`${name} exceeds 65,536 encoded characters.`);
  return JSON.parse(encoded) as Record<string, unknown>;
}

function tags(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 12) invalid("tags must be an array of at most 12 values.");
  return [...new Set(value.map((item) => text(item, "tag", 40)))];
}

function nullableId(value: unknown, name: string): string | null {
  if (value === null || value === "") return null;
  return text(value, name, 128);
}

function text(value: unknown, name: string, maximum: number, allowEmpty = false): string {
  if (typeof value !== "string" || value.length > maximum || (!allowEmpty && !value.trim())) {
    invalid(`${name} must be ${allowEmpty ? "text" : "non-empty text"} of at most ${maximum} characters.`);
  }
  return value.trim();
}

function invalid(message: string): never {
  throw new ProviderError(message, { code: "INVALID_QUERY" });
}

