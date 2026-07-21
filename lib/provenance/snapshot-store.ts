import { canonicalJson, sha256Hex } from "./hash";
import type { DatasetSnapshotManifest } from "./manifest";

export interface SnapshotStoreEnv {
  SNAPSHOTS?: R2Bucket;
}

export interface SnapshotStoreResult {
  status: "stored" | "already-present" | "unavailable";
  snapshotId: string;
  manifestKey: string | null;
  canonicalKey: string | null;
  rawKey: string | null;
  writes: number;
  note: string;
}

export async function storeImmutableSnapshot(
  env: SnapshotStoreEnv,
  manifest: DatasetSnapshotManifest,
  canonicalPayload: unknown,
  rawPayload?: unknown,
): Promise<SnapshotStoreResult> {
  if (!env.SNAPSHOTS) {
    return {
      status: "unavailable",
      snapshotId: manifest.snapshotId,
      manifestKey: null,
      canonicalKey: null,
      rawKey: null,
      writes: 0,
      note: "R2 binding SNAPSHOTS is unavailable; the reproducible manifest remains in the response only.",
    };
  }

  const canonicalBody = canonicalJson(canonicalPayload);
  const canonicalHash = await sha256Hex(canonicalBody);
  if (canonicalHash !== manifest.canonicalContentHash) {
    throw new Error("Canonical snapshot content does not match its manifest hash.");
  }
  const rawBody = rawPayload === undefined ? null : canonicalJson(rawPayload);
  const rawHash = rawBody === null ? null : await sha256Hex(rawBody);
  if (rawHash !== manifest.rawContentHash) {
    throw new Error("Raw snapshot content does not match its manifest hash.");
  }
  const manifestBody = canonicalJson(manifest);
  const manifestHash = await sha256Hex(manifestBody);
  const canonicalKey = `sha256/${canonicalHash}/canonical.json`;
  const rawKey = rawHash ? `sha256/${rawHash}/raw.json` : null;
  const manifestKey = `manifests/${manifest.snapshotId}/${manifestHash}.json`;
  let writes = 0;
  writes += await putContentAddressed(env.SNAPSHOTS, canonicalKey, canonicalBody, canonicalHash);
  if (rawKey && rawBody && rawHash) {
    writes += await putContentAddressed(env.SNAPSHOTS, rawKey, rawBody, rawHash);
  }
  writes += await putContentAddressed(env.SNAPSHOTS, manifestKey, manifestBody, manifestHash);

  return {
    status: writes === 0 ? "already-present" : "stored",
    snapshotId: manifest.snapshotId,
    manifestKey,
    canonicalKey,
    rawKey,
    writes,
    note: "Objects use content-addressed keys; an existing key is never overwritten with different bytes.",
  };
}

async function putContentAddressed(
  bucket: R2Bucket,
  key: string,
  body: string,
  contentHash: string,
): Promise<number> {
  const existing = await bucket.head(key);
  if (existing) {
    const recordedHash = existing.customMetadata?.contentHash;
    if (recordedHash && recordedHash !== contentHash) {
      throw new Error(`Immutable snapshot key collision at ${key}.`);
    }
    return 0;
  }
  await bucket.put(key, body, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    customMetadata: { contentHash, immutable: "true" },
  });
  return 1;
}

