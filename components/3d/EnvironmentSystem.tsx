import type { ReactNode } from "react";

export interface EnvironmentSystemProps {
  readonly background?: string;
  readonly fog?: {
    readonly colour: string;
    readonly near: number;
    readonly far: number;
  } | null;
  readonly children?: ReactNode;
}

export function EnvironmentSystem({
  background,
  fog = null,
  children,
}: EnvironmentSystemProps) {
  const validFog = fog
    && Number.isFinite(fog.near)
    && Number.isFinite(fog.far)
    && fog.near >= 0
    && fog.far > fog.near;
  return (
    <>
      {background && <color attach="background" args={[background]} />}
      {validFog && (
        <fog attach="fog" args={[fog.colour, fog.near, fog.far]} />
      )}
      {children}
    </>
  );
}
