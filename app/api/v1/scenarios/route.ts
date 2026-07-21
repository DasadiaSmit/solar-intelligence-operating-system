import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents, scenarios } from "@/db/schema";
import { canonicalJson, reproducibleId, sha256Hex } from "@/lib/provenance";
import { API_VERSION, apiError, databaseUnavailable, jsonResponse, readBoundedJson, requestId } from "../_shared";
import { actorId, BUILT_IN_SCENARIOS, validateScenarioInput, type ScenarioInput } from "./_scenario";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    const ownerId = await actorId(request);
    if (!ownerId) return scenarioList(id, [], "anonymous-sample-mode");
    try {
      const rows = await getDb()
        .select()
        .from(scenarios)
        .where(eq(scenarios.ownerId, ownerId))
        .orderBy(desc(scenarios.updatedAt))
        .limit(50);
      return scenarioList(id, rows.map(publicScenario), "d1");
    } catch (error) {
      if (!databaseUnavailable(error)) throw error;
      return scenarioList(id, [], "optional-unavailable");
    }
  } catch (error) {
    return apiError(error, id);
  }
}

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    const input = validateScenarioInput(await readBoundedJson(request)) as ScenarioInput;
    const ownerId = await actorId(request);
    const inputHash = await sha256Hex(canonicalJson(input.inputs));
    const scenarioId = await reproducibleId("scn", {
      ownerId: ownerId ?? "ephemeral",
      input,
      nonce: crypto.randomUUID(),
    });
    const now = new Date().toISOString();
    const ephemeral = {
      id: scenarioId,
      ...input,
      status: "draft",
      inputsHash: inputHash,
      resultSnapshotId: null,
      createdAt: now,
      updatedAt: now,
      persisted: false,
    };
    if (!ownerId) {
      return jsonResponse(
        {
          apiVersion: API_VERSION,
          requestId: id,
          ok: true,
          data: ephemeral,
          persistence: "ephemeral-authentication-required",
        },
        { status: 201, requestId: id },
      );
    }
    try {
      const db = getDb();
      const [row] = await db
        .insert(scenarios)
        .values({
          id: scenarioId,
          ownerId,
          siteId: input.siteId,
          baseConfigurationId: input.baseConfigurationId,
          name: input.name,
          description: input.description,
          lifecycle: input.lifecycle,
          branchFromScenarioId: input.branchFromScenarioId,
          inputsJson: canonicalJson(input.inputs),
          inputsHash: inputHash,
          tagsJson: canonicalJson(input.tags),
        })
        .returning();
      await db.insert(auditEvents).values({
        id: crypto.randomUUID(),
        actorId: ownerId,
        actorRole: "analyst",
        action: "scenario.create",
        resourceType: "scenario",
        resourceId: scenarioId,
        requestId: id,
        afterHash: inputHash,
        occurredAtUtc: now,
      });
      return jsonResponse(
        { apiVersion: API_VERSION, requestId: id, ok: true, data: publicScenario(row), persistence: "d1" },
        { status: 201, requestId: id },
      );
    } catch (error) {
      if (!databaseUnavailable(error)) throw error;
      return jsonResponse(
        {
          apiVersion: API_VERSION,
          requestId: id,
          ok: true,
          data: ephemeral,
          persistence: "ephemeral-database-unavailable",
        },
        { status: 201, requestId: id },
      );
    }
  } catch (error) {
    return apiError(error, id);
  }
}

function scenarioList(id: string, rows: unknown[], persistence: string) {
  return jsonResponse(
    {
      apiVersion: API_VERSION,
      requestId: id,
      ok: true,
      data: [...BUILT_IN_SCENARIOS, ...rows],
      persistence,
      note: "Built-in scenarios are parameter presets, not observed events or validated results.",
    },
    { requestId: id },
  );
}

function publicScenario(row: typeof scenarios.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    lifecycle: row.lifecycle,
    siteId: row.siteId,
    baseConfigurationId: row.baseConfigurationId,
    branchFromScenarioId: row.branchFromScenarioId,
    inputs: safeJson(row.inputsJson, {}),
    tags: safeJson(row.tagsJson, []),
    resultSnapshotId: row.resultSnapshotId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    persisted: true,
  };
}

function safeJson(value: string, fallback: unknown) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

