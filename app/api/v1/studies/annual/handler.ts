import type { SystemConfig } from "@/lib/contracts";
import { ProviderError, type ProviderRuntimeEnv } from "@/lib/providers";
import { buildAnnualResearchStudy, type ResearchDataMode } from "@/lib/research";
import { mergeSystemConfig } from "@/lib/sample";
import { API_VERSION, apiError, jsonResponse, requestId } from "../../_shared";

/** Worker-independent HTTP boundary used by the route and integration tests. */
export async function handleAnnualStudyRequest(
  request: Request,
  env: ProviderRuntimeEnv = {},
) {
  const id = requestId(request);
  try {
    const url = new URL(request.url);
    const mode = researchMode(url.searchParams.get("mode"));
    const config = researchConfig(url.searchParams);
    const study = await buildAnnualResearchStudy(config, { mode, env });
    return jsonResponse(
      {
        apiVersion: API_VERSION,
        requestId: id,
        ok: true,
        status: mode === "live" ? "experimental" : "simulated",
        data: study,
        meta: {
          provider: study.datasets.map((dataset) => dataset.providerName).filter(
            (value, index, values) => values.indexOf(value) === index,
          ),
          modelName: "Annual research evidence protocol",
          forecastIssueTimeUtc: null,
          dataTimestampUtc: "2022-01-01/2025-12-31",
          resolution: "hourly source years; 8,760-hour no-leap research calendar",
          units: "W m-2 weather inputs; kWh interval energy; kWh annual energy",
          dataQuality: study.datasets.map((dataset) => ({
            year: dataset.year,
            providerScore: dataset.providerQualityScore,
            providerCompleteness: dataset.providerCompleteness,
            scienceScore: dataset.scienceQualityScore,
            scienceCompleteness: dataset.scienceCompleteness,
            derivationCounts: dataset.derivationCounts,
          })),
          calculationVersion: study.configuration.calculationVersion,
          assumptions: study.representativeYear.assumptions,
          uncertainty: study.annualEstimate.uncertainty,
          guaranteeNotice: study.guaranteeNotice,
        },
      },
      {
        requestId: id,
        cacheControl: mode === "live"
          ? "public, max-age=86400, stale-while-revalidate=604800"
          : "public, max-age=3600, stale-while-revalidate=86400",
      },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

function researchMode(value: string | null): ResearchDataMode {
  if (value === null || value === "" || value === "sample") return "sample";
  if (value === "live") return "live";
  invalid("mode must be sample or live.");
}

function researchConfig(parameters: URLSearchParams): SystemConfig {
  const base = mergeSystemConfig();
  const latitude = bounded(parameters.get("latitude"), base.location.latitude, -90, 90, "latitude");
  const longitude = bounded(parameters.get("longitude"), base.location.longitude, -180, 180, "longitude");
  const elevationM = bounded(parameters.get("elevationM"), base.location.elevationM, -500, 9_000, "elevationM");
  const capacityKwDc = bounded(
    parameters.get("capacityKwDc"),
    base.array.capacityKwDc,
    0.1,
    1_000_000,
    "capacityKwDc",
  );
  const tiltDeg = bounded(parameters.get("tiltDeg"), base.array.tiltDeg, 0, 90, "tiltDeg");
  const azimuthDeg = bounded(parameters.get("azimuthDeg"), base.array.azimuthDeg, -180, 360, "azimuthDeg");
  const systemLossPct = bounded(
    parameters.get("systemLossPct"),
    aggregatePvLossPct(base.losses),
    0,
    80,
    "systemLossPct",
  );
  const isDefaultLocation = Math.abs(latitude - base.location.latitude) < 1e-9
    && Math.abs(longitude - base.location.longitude) < 1e-9;
  const explicitName = parameters.get("locationName")?.trim().slice(0, 120);
  return mergeSystemConfig({
    location: {
      ...base.location,
      id: `${latitude.toFixed(4)}-${longitude.toFixed(4)}`,
      name: explicitName || (isDefaultLocation ? base.location.name : "Custom UTC research location"),
      latitude,
      longitude,
      elevationM,
      timezone: isDefaultLocation ? base.location.timezone : "UTC",
      standardUtcOffsetMinutes: isDefaultLocation ? base.location.standardUtcOffsetMinutes : 0,
    },
    array: { ...base.array, capacityKwDc, tiltDeg, azimuthDeg },
    losses: scalePvLosses(base.losses, systemLossPct),
  });
}

const PV_LOSS_KEYS = [
  "horizon",
  "shading",
  "soiling",
  "dust",
  "snow",
  "mismatch",
  "wiring",
  "strings",
  "availability",
] as const;

function aggregatePvLossPct(losses: SystemConfig["losses"]): number {
  const retention = PV_LOSS_KEYS.reduce(
    (product, key) => product * (1 - Math.min(0.99, Math.max(0, losses[key]))),
    1,
  );
  return (1 - retention) * 100;
}

/** Preserves the relative log-retention contribution of each named PV loss. */
function scalePvLosses(
  losses: SystemConfig["losses"],
  aggregateLossPct: number,
): SystemConfig["losses"] {
  const currentRetention = Math.max(1e-9, 1 - aggregatePvLossPct(losses) / 100);
  const targetRetention = Math.max(0.2, 1 - aggregateLossPct / 100);
  if (Math.abs(Math.log(currentRetention)) < 1e-12) {
    const scaled = { ...losses };
    const perLossRetention = targetRetention ** (1 / PV_LOSS_KEYS.length);
    for (const key of PV_LOSS_KEYS) scaled[key] = 1 - perLossRetention;
    return scaled;
  }
  const exponent = Math.log(targetRetention) / Math.log(currentRetention);
  const scaled = { ...losses };
  for (const key of PV_LOSS_KEYS) {
    scaled[key] = Math.min(0.99, Math.max(0, 1 - (1 - losses[key]) ** exponent));
  }
  return scaled;
}

function bounded(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
  name: string,
): number {
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    invalid(`${name} must be a number between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function invalid(message: string): never {
  throw new ProviderError(message, { code: "INVALID_QUERY" });
}
