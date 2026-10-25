import frozenEvidence from "@/evidence/sheffield-2026-10-25.json";
import { validateAssessmentEvidenceBundle } from "@/lib/research/assessment-evidence";
import { API_VERSION, apiError, jsonResponse, requestId } from "../../_shared";

/** Saved research evidence only. Never acquires weather or runs a new PV study. */
export async function GET(request: Request) {
  const id = requestId(request);
  try {
    const data = await validateAssessmentEvidenceBundle(frozenEvidence);
    return jsonResponse({ apiVersion: API_VERSION, requestId: id, ok: true, data }, { requestId: id, cacheControl: "private, max-age=3600" });
  } catch (error) { return apiError(error, id); }
}
