import { env } from "cloudflare:workers";
import type { ProviderRuntimeEnv } from "@/lib/providers";

export function runtimeEnv(): ProviderRuntimeEnv {
  return env as unknown as ProviderRuntimeEnv;
}

