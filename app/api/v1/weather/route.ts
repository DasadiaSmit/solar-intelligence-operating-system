import { getWeatherDataset, parseWeatherQuery } from "@/lib/providers";
import { API_VERSION, apiError, jsonResponse, requestId } from "../_shared";
import { runtimeEnv } from "../_runtime";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    const url = new URL(request.url);
    const query = parseWeatherQuery({
      latitude: url.searchParams.get("latitude") ?? undefined,
      longitude: url.searchParams.get("longitude") ?? undefined,
      startUtc: url.searchParams.get("start") ?? undefined,
      endUtc: url.searchParams.get("end") ?? undefined,
      dataClass: url.searchParams.get("dataClass") ?? undefined,
      provider: url.searchParams.get("provider") ?? undefined,
      mode: url.searchParams.get("mode") ?? undefined,
      allowSimulatedFallback: url.searchParams.get("allowSimulatedFallback") ?? undefined,
      panelTiltDeg: url.searchParams.get("tilt") ?? undefined,
      panelAzimuthDeg: url.searchParams.get("azimuth") ?? undefined,
    });
    const dataset = await getWeatherDataset(query, { env: runtimeEnv() });
    const publicDataset = {
      records: dataset.records,
      provenance: dataset.provenance,
      attempts: dataset.attempts,
      cache: dataset.cache,
    };
    const maximumAge =
      dataset.provenance.actualDataClass === "issued_forecast"
        ? 300
        : dataset.provenance.actualDataClass === "simulation"
          ? 3_600
          : 900;
    return jsonResponse(
      {
        apiVersion: API_VERSION,
        requestId: id,
        ok: true,
        status: dataset.provenance.actualDataClass === "simulation" ? "simulated" : "implemented",
        query,
        data: publicDataset,
        guaranteeNotice: "Weather and generation estimates are uncertain and are not guaranteed production.",
      },
      {
        requestId: id,
        cacheControl: `public, max-age=${maximumAge}, stale-while-revalidate=${maximumAge * 2}`,
      },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
