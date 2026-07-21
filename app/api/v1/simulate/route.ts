import { CALCULATION_VERSION, MODEL_VERSION, type SystemConfig } from "@/lib/contracts";
import { buildOperatingSnapshot } from "@/lib/operating-snapshot";
import { reproducibleId } from "@/lib/provenance";
import { API_VERSION, apiError, jsonResponse, readBoundedJson, requestId } from "../_shared";
import { validateSystemConfigPatch } from "../_config-validation";

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    const body = await readBoundedJson(request);
    const source = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
    const config = validateSystemConfigPatch(source.config ?? source) as Partial<SystemConfig>;
    const snapshot = buildOperatingSnapshot(config);
    const resultId = await reproducibleId("sim", {
      config: snapshot.config,
      calculationVersion: CALCULATION_VERSION,
      representativeYearId: snapshot.representativeYear.id,
    });
    return jsonResponse(
      {
        apiVersion: API_VERSION,
        requestId: id,
        ok: true,
        status: "simulated",
        data: snapshot,
        meta: {
          resultId,
          provider: "sios deterministic sample weather 2022–2025",
          modelName: "physics + representative-year + probabilistic baseline ensemble",
          modelVersion: MODEL_VERSION,
          forecastIssueTimeUtc: null,
          dataTimestampUtc: snapshot.status.generatedAt,
          resolution: "hourly / 8,760 hours",
          units: "canonical SI inputs; kWh/MWh energy outputs",
          dataQuality: snapshot.summary.qualityScore,
          calculationVersion: CALCULATION_VERSION,
          assumptions: snapshot.representativeYear.assumptions,
          uncertainty: snapshot.representativeYear.uncertaintyMethod,
          guaranteeNotice: snapshot.status.guaranteeNotice,
        },
      },
      { requestId: id, cacheControl: "no-store" },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

