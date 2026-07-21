import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents, scenarios } from "@/db/schema";
import { canonicalJson, sha256Hex } from "@/lib/provenance";
import { API_VERSION, apiError, databaseUnavailable, jsonResponse, readBoundedJson, requestId } from "../../_shared";
import { actorId, BUILT_IN_SCENARIOS, validateScenarioInput } from "../_scenario";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const requestIdentifier = requestId(request);
  try {
    const { id } = await context.params;
    const builtIn = BUILT_IN_SCENARIOS.find((scenario) => scenario.id === id);
    if (builtIn) return jsonResponse({ apiVersion: API_VERSION, requestId: requestIdentifier, ok: true, data: builtIn });
    const ownerId = await actorId(request);
    if (!ownerId) return notFound(requestIdentifier);
    try {
      const row = await getDb()
        .select()
        .from(scenarios)
        .where(and(eq(scenarios.id, id), eq(scenarios.ownerId, ownerId)))
        .limit(1);
      return row[0]
        ? jsonResponse({ apiVersion: API_VERSION, requestId: requestIdentifier, ok: true, data: row[0] })
        : notFound(requestIdentifier);
    } catch (error) {
      if (!databaseUnavailable(error)) throw error;
      return notFound(requestIdentifier, "Persistence is unavailable in sample mode.");
    }
  } catch (error) {
    return apiError(error, requestIdentifier);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestIdentifier = requestId(request);
  try {
    const { id } = await context.params;
    const patch = validateScenarioInput(await readBoundedJson(request), true);
    const ownerId = await actorId(request);
    if (!ownerId) {
      return jsonResponse({
        apiVersion: API_VERSION,
        requestId: requestIdentifier,
        ok: true,
        data: { id, ...patch, persisted: false },
        persistence: "ephemeral-authentication-required",
      });
    }
    const values: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (patch.name !== undefined) values.name = patch.name;
    if (patch.description !== undefined) values.description = patch.description;
    if (patch.lifecycle !== undefined) values.lifecycle = patch.lifecycle;
    if (patch.siteId !== undefined) values.siteId = patch.siteId;
    if (patch.baseConfigurationId !== undefined) values.baseConfigurationId = patch.baseConfigurationId;
    if (patch.branchFromScenarioId !== undefined) values.branchFromScenarioId = patch.branchFromScenarioId;
    if (patch.inputs !== undefined) {
      values.inputsJson = canonicalJson(patch.inputs);
      values.inputsHash = await sha256Hex(values.inputsJson);
    }
    if (patch.tags !== undefined) values.tagsJson = canonicalJson(patch.tags);
    try {
      const db = getDb();
      const [row] = await db
        .update(scenarios)
        .set(values)
        .where(and(eq(scenarios.id, id), eq(scenarios.ownerId, ownerId)))
        .returning();
      if (!row) return notFound(requestIdentifier);
      await db.insert(auditEvents).values({
        id: crypto.randomUUID(),
        actorId: ownerId,
        actorRole: "analyst",
        action: "scenario.update",
        resourceType: "scenario",
        resourceId: id,
        requestId: requestIdentifier,
        afterHash: await sha256Hex(canonicalJson(patch)),
        occurredAtUtc: new Date().toISOString(),
      });
      return jsonResponse({ apiVersion: API_VERSION, requestId: requestIdentifier, ok: true, data: row, persistence: "d1" });
    } catch (error) {
      if (!databaseUnavailable(error)) throw error;
      return jsonResponse({
        apiVersion: API_VERSION,
        requestId: requestIdentifier,
        ok: true,
        data: { id, ...patch, persisted: false },
        persistence: "ephemeral-database-unavailable",
      });
    }
  } catch (error) {
    return apiError(error, requestIdentifier);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const requestIdentifier = requestId(request);
  try {
    const { id } = await context.params;
    const ownerId = await actorId(request);
    if (!ownerId) {
      return jsonResponse({ apiVersion: API_VERSION, requestId: requestIdentifier, ok: true, deleted: false, persistence: "optional-unavailable" });
    }
    try {
      const rows = await getDb()
        .delete(scenarios)
        .where(and(eq(scenarios.id, id), eq(scenarios.ownerId, ownerId)))
        .returning({ id: scenarios.id });
      return jsonResponse({ apiVersion: API_VERSION, requestId: requestIdentifier, ok: true, deleted: rows.length > 0, id });
    } catch (error) {
      if (!databaseUnavailable(error)) throw error;
      return jsonResponse({ apiVersion: API_VERSION, requestId: requestIdentifier, ok: true, deleted: false, persistence: "optional-unavailable" });
    }
  } catch (error) {
    return apiError(error, requestIdentifier);
  }
}

function notFound(id: string, detail = "Scenario not found.") {
  return jsonResponse(
    { apiVersion: API_VERSION, requestId: id, ok: false, error: { code: "NOT_FOUND", message: detail } },
    { status: 404, requestId: id },
  );
}

