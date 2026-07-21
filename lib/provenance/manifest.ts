import type { WeatherDataset, WeatherQuery } from "@/lib/providers/types";
import { canonicalJson, sha256Hex } from "./hash";

export interface DatasetSnapshotManifest {
  manifestVersion: "sios-dataset-manifest-v1";
  snapshotId: string;
  canonicalContentHash: string;
  rawContentHash: string | null;
  queryHash: string;
  provider: WeatherDataset["provenance"]["provider"];
  requestedDataClass: WeatherDataset["provenance"]["requestedDataClass"];
  actualDataClass: WeatherDataset["provenance"]["actualDataClass"];
  retrievalTimeUtc: string;
  issueTimeUtc: string | null;
  validRangeUtc: [string, string];
  intervalSeconds: number;
  recordCount: number;
  schemaVersion: string;
  calculationVersion: string;
  units: WeatherDataset["provenance"]["units"];
  quality: WeatherDataset["provenance"]["quality"];
  transformations: string[];
  assumptions: string[];
  warnings: string[];
  semanticSubstitution: boolean;
  parentSnapshotIds: string[];
}

export async function createDatasetSnapshotManifest(
  dataset: WeatherDataset,
  query: WeatherQuery,
  parentSnapshotIds: string[] = [],
): Promise<DatasetSnapshotManifest> {
  const canonicalContentHash = await sha256Hex(canonicalJson(dataset.records));
  const rawContentHash =
    dataset.rawPayload === undefined ? null : await sha256Hex(canonicalJson(dataset.rawPayload));
  const queryHash = await sha256Hex(canonicalJson(query));
  if (canonicalContentHash !== dataset.provenance.contentHash) {
    throw new Error("Canonical records no longer match the dataset provenance content hash.");
  }
  const snapshotId = dataset.provenance.snapshotId;
  return {
    manifestVersion: "sios-dataset-manifest-v1",
    snapshotId,
    canonicalContentHash,
    rawContentHash,
    queryHash,
    provider: dataset.provenance.provider,
    requestedDataClass: dataset.provenance.requestedDataClass,
    actualDataClass: dataset.provenance.actualDataClass,
    retrievalTimeUtc: dataset.provenance.retrievalTimeUtc,
    issueTimeUtc: dataset.provenance.issueTimeUtc,
    validRangeUtc: dataset.provenance.validRangeUtc,
    intervalSeconds: dataset.provenance.intervalSeconds,
    recordCount: dataset.records.length,
    schemaVersion: dataset.provenance.schemaVersion,
    calculationVersion: dataset.provenance.calculationVersion,
    units: dataset.provenance.units,
    quality: dataset.provenance.quality,
    transformations: dataset.provenance.transformations,
    assumptions: dataset.provenance.assumptions,
    warnings: dataset.provenance.warnings,
    semanticSubstitution: dataset.provenance.semanticSubstitution,
    parentSnapshotIds,
  };
}
