"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { HeliosRendererPolicy } from "@/features/visual-computing/renderer-policy";

const HeliosRendererPolicyContext =
  createContext<HeliosRendererPolicy | null>(null);

export interface HeliosRendererPolicyProviderProps {
  readonly children: ReactNode;
  readonly policy: HeliosRendererPolicy;
}

export function HeliosRendererPolicyProvider({
  children,
  policy,
}: HeliosRendererPolicyProviderProps) {
  return (
    <HeliosRendererPolicyContext value={policy}>
      {children}
    </HeliosRendererPolicyContext>
  );
}

export function useHeliosScenePolicy(): HeliosRendererPolicy {
  const policy = useContext(HeliosRendererPolicyContext);
  if (!policy) {
    throw new Error(
      "useHeliosScenePolicy must be used inside HeliosCanvas.",
    );
  }
  return policy;
}
