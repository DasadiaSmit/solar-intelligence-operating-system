import { OpenMeteoProvider, PvgisProvider, DeterministicSampleProvider, readProviderConfig } from "@/lib/providers";
import { API_VERSION, jsonResponse, requestId } from "../_shared";
import { runtimeEnv } from "../_runtime";

export async function GET(request: Request) {
  const id = requestId(request);
  const bindings = runtimeEnv();
  const config = readProviderConfig(bindings);
  const database = await checkDatabase(bindings.DB);
  const sample = new DeterministicSampleProvider();
  const openMeteo = new OpenMeteoProvider(config);
  const pvgis = new PvgisProvider(config);
  const degraded = database.status === "error" || database.status === "migration-required";

  return jsonResponse(
    {
      apiVersion: API_VERSION,
      requestId: id,
      ok: true,
      service: "Solar Intelligence Operating System",
      status: degraded ? "degraded" : "operational",
      checkedAtUtc: new Date().toISOString(),
      build: {
        api: API_VERSION,
        providerNormalisation: "sios-provider-normalisation-1.0.0",
        canonicalWeatherSchema: "canonical-weather-hour-v1",
      },
      runtime: {
        configuredProviderMode: config.mode,
        simulatedFallbackEnabled: config.allowSimulatedFallback,
        database,
        snapshotStore: {
          configured: Boolean(bindings.SNAPSHOTS),
          status: bindings.SNAPSHOTS ? "available" : "optional-unavailable",
        },
      },
      providers: [sample.descriptor, openMeteo.descriptor, pvgis.descriptor].map((provider) => ({
        ...provider,
        enabled:
          provider.id === "sample" ||
          (config.mode !== "sample" && ["open-meteo", "pvgis"].includes(provider.id)),
        liveProbed: false,
      })),
      guarantees: {
        productionEstimateGuaranteed: false,
        note: "Health checks configuration and bindings only; it does not claim upstream provider availability.",
      },
    },
    { requestId: id, cacheControl: "no-store" },
  );
}

async function checkDatabase(database: D1Database | undefined) {
  if (!database) return { configured: false, status: "optional-unavailable", detail: "Sample mode remains available." };
  try {
    const migration = await database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'dataset_snapshots'")
      .first<{ name: string }>();
    if (!migration) {
      return {
        configured: true,
        status: "migration-required",
        detail: "D1 is reachable, but the initial Solar Intelligence schema has not been applied.",
      };
    }
    return { configured: true, status: "available", detail: "D1 schema is reachable." };
  } catch (error) {
    return {
      configured: true,
      status: "error",
      detail: error instanceof Error ? error.message.slice(0, 180) : "D1 probe failed.",
    };
  }
}
