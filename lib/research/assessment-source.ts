import { RESEARCH_YEARS } from "./historical-weather";

const ERA5_PRODUCT = "Historical Weather API (era5)";
const EXPECTED_YEAR_KEYS = RESEARCH_YEARS.map(String);

function requireSource(condition: unknown, detail: string): asserts condition {
  if (!condition) throw new Error(`Assessment source policy: ${detail}`);
}

function record(value: unknown, name: string): Record<string, unknown> {
  requireSource(value !== null && typeof value === "object" && !Array.isArray(value), `${name} must be an object.`);
  return value as Record<string, unknown>;
}

function exactYears(value: Record<string, unknown>, name: string): void {
  const keys = Object.keys(value).sort();
  requireSource(keys.length === EXPECTED_YEAR_KEYS.length && keys.every((key, index) => key === EXPECTED_YEAR_KEYS[index]),
    `${name} must contain exactly source years 2022–2025.`);
}

/**
 * Enforce the fixed assessment protocol's source policy independently of bundle
 * integrity. A valid sample/reanalysis bundle is not necessarily an ERA5 study.
 * Full record, chronology and hash validation remains the frozen-bundle layer.
 */
export function assertAssessmentSources(manifestValue: unknown, archiveValue: unknown): void {
  const manifest = record(manifestValue, "manifest");
  const archive = record(archiveValue, "archive");
  requireSource(manifest.mode === "live", "capture manifest mode must be live.");
  requireSource(archive.mode === "live", "archive mode must be live.");
  const datasets = record(archive.datasets, "archive.datasets");
  exactYears(datasets, "archive.datasets");
  exactYears(record(archive.years, "archive.years"), "archive.years");
  requireSource(Array.isArray(archive.evidence) && archive.evidence.length === RESEARCH_YEARS.length,
    "source evidence must contain exactly four ordered years.");

  for (const [index, year] of RESEARCH_YEARS.entries()) {
    const dataset = record(datasets[year], `dataset ${year}`);
    const evidence = record(archive.evidence[index], `evidence ${year}`);
    requireSource(evidence.year === year, "source evidence must be ordered 2022–2025 without missing or duplicate years.");
    const provenance = record(dataset.provenance, `dataset ${year} provenance`);
    const provider = record(provenance.provider, `dataset ${year} provider`);
    requireSource(provider.id === "open-meteo" && evidence.providerId === "open-meteo",
      `dataset/evidence ${year} must identify Open-Meteo.`);
    requireSource(provider.product === ERA5_PRODUCT && evidence.product === ERA5_PRODUCT,
      `dataset/evidence ${year} must identify ${ERA5_PRODUCT}.`);
    for (const source of [provenance, evidence]) {
      requireSource(source.requestedDataClass === "reanalysis" && source.actualDataClass === "reanalysis",
        `dataset/evidence ${year} must be requested and actual reanalysis.`);
    }
    requireSource(provenance.semanticSubstitution === false,
      `dataset ${year} must explicitly exclude semantic substitution.`);
    const raw = record(dataset.rawPayload, `dataset ${year} raw payload`);
    requireSource(Object.keys(raw).length > 0, `dataset ${year} raw payload must not be empty.`);
  }
}
