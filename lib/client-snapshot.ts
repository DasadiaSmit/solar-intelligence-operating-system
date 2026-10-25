import type { OperatingSnapshot } from "./contracts";

/**
 * Compact browser transport for the linked 8,760-hour operating surface.
 * The canonical API retains the complete nested scientific record; this tuple
 * contains only fields consumed by the interactive shell. Its schema is
 * versioned so future clients can reject or migrate incompatible payloads.
 */
export type ClientHourTuple = [
  ghiWm2: number,
  effectivePoaWm2: number,
  ambientTemperatureC: number,
  cloudFraction: number,
  acKWh: number,
  p10KWh: number,
  p90KWh: number,
  demandKWh: number,
  batterySocKWh: number,
  gridImportKWh: number,
  gridExportKWh: number,
  qualityScore: number,
  solarElevationDeg: number,
  solarAzimuthDeg: number,
];

export interface ClientOperatingSnapshot extends Omit<OperatingSnapshot, "hourly"> {
  hourly: ClientHourTuple[];
  transport: {
    format: "sios-hour-tuple-v1";
    resultId: string;
    startTimestampUtc: string;
    intervalSeconds: 3600;
    recordCount: number;
    canonicalDetailEndpoint: "/api/v1/simulate";
  };
}

function compact(value: number, precision = 3): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function compactOperatingSnapshot(snapshot: OperatingSnapshot, resultId: string): ClientOperatingSnapshot {
  return {
    ...snapshot,
    hourly: snapshot.hourly.map((point) => [
      compact(point.weather.ghiWm2, 1),
      compact(point.irradiance.effectiveWm2, 1),
      compact(point.weather.temperatureC, 2),
      compact(point.weather.cloudCoverPct / 100, 4),
      compact(point.generation.acKWh, 4),
      compact(point.forecast.p10KWh, 4),
      compact(point.forecast.p90KWh, 4),
      compact(point.flow.demandKWh, 4),
      compact(point.flow.batterySocKWh, 4),
      compact(point.flow.gridImportKWh, 4),
      compact(point.flow.gridExportKWh, 4),
      compact(point.quality.score, 4),
      compact(point.sun.apparentElevationDeg, 2),
      compact(point.sun.azimuthDeg, 2),
    ]),
    transport: {
      format: "sios-hour-tuple-v1",
      resultId,
      startTimestampUtc: snapshot.hourly[0]?.timestamp ?? "2025-01-01T00:00:00.000Z",
      intervalSeconds: 3600,
      recordCount: snapshot.hourly.length,
      canonicalDetailEndpoint: "/api/v1/simulate",
    },
  };
}
