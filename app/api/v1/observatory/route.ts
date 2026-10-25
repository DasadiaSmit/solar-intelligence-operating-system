import { CALCULATION_VERSION } from "@/lib/contracts";
import { buildOperatingSnapshot } from "@/lib/operating-snapshot";
import { reproducibleId } from "@/lib/provenance";
import { ProviderError } from "@/lib/providers";
import { buildSunlitFrame, SunlitFrameError } from "@/features/sunlit-observatory/build-frame";
import { isSunlitDateUtc } from "@/features/sunlit-observatory/frame";
import { API_VERSION, apiError, jsonResponse, requestId } from "../_shared";

/** A single immutable sample source per Worker isolate, never user scenario state. */
let sampleSource: Promise<{
  snapshot: ReturnType<typeof buildOperatingSnapshot>;
  resultId: string;
}> | undefined;

function canonicalSampleSource() {
  if (!sampleSource) {
    sampleSource = Promise.resolve().then(async () => {
      const snapshot = buildOperatingSnapshot();
      const resultId = await reproducibleId("sim", {
        config: snapshot.config,
        calculationVersion: CALCULATION_VERSION,
        representativeYearId: snapshot.representativeYear.id,
      });
      return { snapshot, resultId };
    }).catch((error: unknown) => {
      sampleSource = undefined;
      throw error;
    });
  }
  return sampleSource;
}

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    const url = new URL(request.url);
    const dates = url.searchParams.getAll("date");
    if (dates.length > 1 || (dates.length === 1 && !isSunlitDateUtc(dates[0]))) {
      throw new ProviderError("Provide one valid UTC date in YYYY-MM-DD format.", { code: "INVALID_QUERY" });
    }
    const { snapshot, resultId } = await canonicalSampleSource();
    const frame = buildSunlitFrame({ snapshot, resultId, dateUtc: dates[0] });
    return jsonResponse({
      apiVersion: API_VERSION,
      requestId: id,
      ok: true,
      status: "simulated",
      data: frame,
    }, { requestId: id, cacheControl: "private, max-age=300" });
  } catch (error) {
    return apiError(error instanceof SunlitFrameError && error.kind === "invalid-query"
      ? new ProviderError(error.message, { code: "INVALID_QUERY" })
      : error, id);
  }
}
