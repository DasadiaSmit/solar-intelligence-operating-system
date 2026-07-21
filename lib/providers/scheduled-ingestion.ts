import { canonicalJson, createDatasetSnapshotManifest, sha256Hex, storeImmutableSnapshot } from "@/lib/provenance";
import { readProviderConfig } from "./config";
import { parseWeatherQuery } from "./query";
import { getWeatherDataset } from "./service";
import type { ProviderRuntimeEnv, WeatherProviderId } from "./types";

export interface ScheduledIngestionResult {
  status: "completed" | "no-op" | "failed";
  runId: string | null;
  providerId: WeatherProviderId | null;
  scheduledTimeUtc: string;
  snapshotId: string | null;
  recordCount: number;
  objectStore: "stored" | "already-present" | "unavailable" | "not-attempted";
  databaseRecorded: boolean;
  detail: string;
}

export async function runScheduledIngestion(
  env: ProviderRuntimeEnv,
  scheduledTime: number | Date = new Date(),
): Promise<ScheduledIngestionResult> {
  const scheduled = floorHour(
    scheduledTime instanceof Date ? scheduledTime : new Date(scheduledTime),
  );
  const scheduledTimeUtc = scheduled.toISOString();
  if (!env.DB) {
    return {
      status: "no-op",
      runId: null,
      providerId: null,
      scheduledTimeUtc,
      snapshotId: null,
      recordCount: 0,
      objectStore: "not-attempted",
      databaseRecorded: false,
      detail: "D1 binding DB is unavailable; scheduled ingestion performed no network or storage work.",
    };
  }

  const config = readProviderConfig(env);
  const providerId = config.ingestionProvider;
  const query = ingestionQuery(providerId, scheduled, config.defaultLatitude, config.defaultLongitude);
  const runId = `prun_${crypto.randomUUID()}`;
  const startedAtUtc = new Date().toISOString();
  let objectStoreStatus: ScheduledIngestionResult["objectStore"] = "not-attempted";
  try {
    const dataset = await getWeatherDataset(query, { env, bypassCache: true });
    const manifest = await createDatasetSnapshotManifest(dataset, query);
    const stored = await storeImmutableSnapshot(
      env,
      manifest,
      dataset.records,
      dataset.rawPayload,
    );
    objectStoreStatus = stored.status;
    const completedAtUtc = new Date().toISOString();
    const attempts = dataset.attempts.reduce((sum, attempt) => sum + 1 + attempt.retryCount, 0);
    const lastAttempt = dataset.attempts.at(-1);
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO provider_runs (
          id, provider_id, provider_version, product, requested_data_class,
          actual_data_class, query_json, query_hash, status, scheduled_time_utc,
          started_at_utc, completed_at_utc, issue_time_utc, attempt_count,
          http_status, semantic_substitution, quality_score, elapsed_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        runId,
        dataset.provenance.provider.id,
        dataset.provenance.provider.version,
        dataset.provenance.provider.product,
        dataset.provenance.requestedDataClass,
        dataset.provenance.actualDataClass,
        canonicalJson(query),
        manifest.queryHash,
        "completed",
        scheduledTimeUtc,
        startedAtUtc,
        completedAtUtc,
        dataset.provenance.issueTimeUtc,
        attempts,
        lastAttempt?.httpStatus ?? null,
        dataset.provenance.semanticSubstitution ? 1 : 0,
        dataset.provenance.quality.score,
        Math.max(0, Date.parse(completedAtUtc) - Date.parse(startedAtUtc)),
      ),
      env.DB.prepare(
        `INSERT OR IGNORE INTO dataset_snapshots (
          id, provider_run_id, provider_id, data_class, schema_version,
          calculation_version, canonical_content_hash, raw_content_hash,
          query_hash, manifest_key, canonical_object_key, raw_object_key,
          valid_from_utc, valid_to_utc, interval_seconds, record_count,
          quality_score, units_json, transformations_json, assumptions_json,
          parent_snapshot_ids_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        manifest.snapshotId,
        runId,
        manifest.provider.id,
        manifest.actualDataClass,
        manifest.schemaVersion,
        manifest.calculationVersion,
        manifest.canonicalContentHash,
        manifest.rawContentHash,
        manifest.queryHash,
        stored.manifestKey,
        stored.canonicalKey,
        stored.rawKey,
        manifest.validRangeUtc[0],
        manifest.validRangeUtc[1],
        manifest.intervalSeconds,
        manifest.recordCount,
        manifest.quality.score,
        canonicalJson(manifest.units),
        canonicalJson(manifest.transformations),
        canonicalJson(manifest.assumptions),
        canonicalJson(manifest.parentSnapshotIds),
      ),
      env.DB.prepare(
        `INSERT INTO job_state (
          job_key, job_type, status, scheduled_for_utc, last_started_at_utc,
          last_completed_at_utc, last_success_at_utc, attempt_count,
          consecutive_failures, checkpoint_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(job_key) DO UPDATE SET
          status = excluded.status,
          scheduled_for_utc = excluded.scheduled_for_utc,
          last_started_at_utc = excluded.last_started_at_utc,
          last_completed_at_utc = excluded.last_completed_at_utc,
          last_success_at_utc = excluded.last_success_at_utc,
          attempt_count = job_state.attempt_count + excluded.attempt_count,
          consecutive_failures = 0,
          checkpoint_json = excluded.checkpoint_json,
          last_error_code = NULL,
          last_error_message = NULL,
          updated_at = excluded.updated_at`,
      ).bind(
        `weather-refresh:${providerId}`,
        "provider-weather-refresh",
        "completed",
        scheduledTimeUtc,
        startedAtUtc,
        completedAtUtc,
        completedAtUtc,
        1,
        0,
        canonicalJson({ snapshotId: manifest.snapshotId, providerId }),
        completedAtUtc,
      ),
    ]);

    return {
      status: "completed",
      runId,
      providerId,
      scheduledTimeUtc,
      snapshotId: manifest.snapshotId,
      recordCount: manifest.recordCount,
      objectStore: stored.status,
      databaseRecorded: true,
      detail:
        dataset.provenance.actualDataClass === "simulation"
          ? "A deterministic, explicitly simulated refresh was recorded."
          : "A validated provider refresh and immutable snapshot manifest were recorded.",
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 500) : "Scheduled ingestion failed.";
    await recordFailure(env.DB, {
      runId,
      providerId,
      query,
      scheduledTimeUtc,
      startedAtUtc,
      detail,
      errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    });
    return {
      status: "failed",
      runId,
      providerId,
      scheduledTimeUtc,
      snapshotId: null,
      recordCount: 0,
      objectStore: objectStoreStatus,
      databaseRecorded: false,
      detail,
    };
  }
}

function ingestionQuery(
  provider: WeatherProviderId,
  scheduled: Date,
  latitude: number,
  longitude: number,
) {
  const common = { latitude, longitude, provider };
  if (provider === "pvgis") {
    return parseWeatherQuery({
      ...common,
      dataClass: "typical_meteorological_year",
      mode: "live",
      allowSimulatedFallback: false,
    });
  }
  if (provider === "open-meteo") {
    return parseWeatherQuery({
      ...common,
      dataClass: "issued_forecast",
      mode: "live",
      allowSimulatedFallback: false,
      startUtc: scheduled.toISOString(),
      endUtc: new Date(scheduled.getTime() + 47 * 3_600_000).toISOString(),
    });
  }
  return parseWeatherQuery({
    ...common,
    dataClass: "simulation",
    mode: "sample",
    startUtc: scheduled.toISOString(),
    endUtc: new Date(scheduled.getTime() + 23 * 3_600_000).toISOString(),
  });
}

async function recordFailure(
  database: D1Database,
  input: {
    runId: string;
    providerId: WeatherProviderId;
    query: unknown;
    scheduledTimeUtc: string;
    startedAtUtc: string;
    detail: string;
    errorCode: string;
  },
): Promise<void> {
  try {
    const queryJson = canonicalJson(input.query);
    const queryHash = await sha256Hex(queryJson);
    const completedAtUtc = new Date().toISOString();
    await database.batch([
      database
        .prepare(
          `INSERT INTO provider_runs (
            id, provider_id, provider_version, product, requested_data_class,
            query_json, query_hash, status, scheduled_time_utc, started_at_utc,
            completed_at_utc, attempt_count, error_code, error_message
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          input.runId,
          input.providerId,
          "unknown",
          "scheduled refresh",
          "unknown",
          queryJson,
          queryHash,
          "failed",
          input.scheduledTimeUtc,
          input.startedAtUtc,
          completedAtUtc,
          1,
          input.errorCode,
          input.detail,
        ),
      database
        .prepare(
          `INSERT INTO job_state (
            job_key, job_type, status, scheduled_for_utc, last_started_at_utc,
            last_completed_at_utc, attempt_count, consecutive_failures,
            last_error_code, last_error_message, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(job_key) DO UPDATE SET
            status = excluded.status,
            scheduled_for_utc = excluded.scheduled_for_utc,
            last_started_at_utc = excluded.last_started_at_utc,
            last_completed_at_utc = excluded.last_completed_at_utc,
            attempt_count = job_state.attempt_count + 1,
            consecutive_failures = job_state.consecutive_failures + 1,
            last_error_code = excluded.last_error_code,
            last_error_message = excluded.last_error_message,
            updated_at = excluded.updated_at`,
        )
        .bind(
          `weather-refresh:${input.providerId}`,
          "provider-weather-refresh",
          "failed",
          input.scheduledTimeUtc,
          input.startedAtUtc,
          completedAtUtc,
          1,
          1,
          input.errorCode,
          input.detail,
          completedAtUtc,
        ),
    ]);
  } catch {
    // The scheduler must never crash the Worker because migrations or D1 are unavailable.
  }
}

function floorHour(date: Date): Date {
  const result = new Date(date);
  if (!Number.isFinite(result.getTime())) return floorHour(new Date());
  result.setUTCMinutes(0, 0, 0);
  return result;
}
