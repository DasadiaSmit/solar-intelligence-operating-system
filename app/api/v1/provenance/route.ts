import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { datasetSnapshots } from "@/db/schema";
import { createDatasetSnapshotManifest } from "@/lib/provenance";
import { getWeatherDataset, parseWeatherQuery } from "@/lib/providers";
import { API_VERSION, apiError, databaseUnavailable, jsonResponse, requestId } from "../_shared";
import { runtimeEnv } from "../_runtime";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    const url = new URL(request.url);
    const requestedSnapshotId = url.searchParams.get("snapshotId")?.trim() || null;
    const query = parseWeatherQuery({ dataClass: "simulation", provider: "sample", mode: "sample" });
    const dataset = await getWeatherDataset(query, { env: runtimeEnv() });
    const manifest = await createDatasetSnapshotManifest(dataset, query);
    const persisted = await readPersisted(requestedSnapshotId);
    return jsonResponse(
      {
        apiVersion: API_VERSION,
        requestId: id,
        ok: true,
        status: "implemented",
        data: {
          activeSampleManifest: manifest,
          persistedSnapshots: persisted.rows,
          persistence: persisted.persistence,
          method: {
            identifiers: "SHA-256 over canonical JSON, query, provider/schema and calculation versions",
            rawPayloadEchoed: false,
            immutableObjectKeys: "R2 keys are content-addressed when the SNAPSHOTS binding is available.",
          },
        },
      },
      { requestId: id, cacheControl: "no-store" },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

async function readPersisted(snapshotId: string | null) {
  try {
    const db = getDb();
    const query = db.select().from(datasetSnapshots);
    const rows = snapshotId
      ? await query.where(eq(datasetSnapshots.id, snapshotId)).limit(1)
      : await query.orderBy(desc(datasetSnapshots.createdAt)).limit(20);
    return { rows, persistence: "d1" };
  } catch (error) {
    if (!databaseUnavailable(error)) throw error;
    return { rows: [], persistence: "optional-unavailable" };
  }
}

