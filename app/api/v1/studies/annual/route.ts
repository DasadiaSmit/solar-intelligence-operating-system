import { runtimeEnv } from "../../_runtime";
import { handleAnnualStudyRequest } from "./handler";

export async function GET(request: Request) {
  return handleAnnualStudyRequest(request, runtimeEnv());
}
