/** Renderer-neutral, bounded canonical evidence for the sunlit interface. */
export const SUNLIT_FRAME_SCHEMA_VERSION = "1.0.0" as const;
export const DEFAULT_SUNLIT_INDEX = 171 * 24 + 12;

export interface SunlitHour {
  readonly index: number;
  readonly timestampUtc: string;
  readonly solarElevationDeg: number;
  readonly solarAzimuthDeg: number;
  readonly isDaylight: boolean;
  readonly incidenceDeg: number;
  readonly arrayTiltDeg: number;
  readonly arrayAzimuthDeg: number;
  readonly generationKWh: number;
  readonly demandKWh: number;
  readonly solarToLoadKWh: number;
  readonly batteryChargeInputKWh: number;
  readonly batteryDischargeDeliveredKWh: number;
  readonly batterySocKWh: number;
  readonly gridImportKWh: number;
  readonly gridExportKWh: number;
  readonly curtailedKWh: number;
  readonly ghiWm2: number;
  readonly poaWm2: number;
  readonly temperatureC: number;
  readonly cloudCoverPct: number;
  readonly humidityPct: number;
  readonly windSpeedMs: number;
  readonly qualityScore: number;
}

export interface SunlitFrame {
  readonly schemaVersion: typeof SUNLIT_FRAME_SCHEMA_VERSION;
  readonly resultId: string;
  readonly lifecycle: "IMPLEMENTED" | "EXPERIMENTAL" | "SIMULATED" | "PLANNED";
  readonly provider: string;
  readonly datasetVersion: string;
  readonly calculationVersion: string;
  readonly site: {
    readonly name: string;
    readonly latitude: number;
    readonly longitude: number;
    readonly timeZone: string;
  };
  readonly dateUtc: string;
  readonly minDateUtc: string;
  readonly maxDateUtc: string;
  readonly initialIndex: number;
  readonly intervalSeconds: 3600;
  readonly timestampRole: "canonical-record-anchor";
  readonly array: {
    readonly tiltDeg: number;
    readonly azimuthDeg: number;
    readonly capacityKwDc: number;
  };
  readonly battery: {
    readonly enabled: boolean;
    readonly capacityKWh: number;
    readonly minSocFraction: number;
    readonly maxSocFraction: number;
    readonly reserveFraction: number;
  };
  readonly annual: {
    readonly generationKWh: number;
  };
  readonly provenance: {
    readonly evidenceRefIds: readonly string[];
    readonly scientificStatus: string;
    readonly guaranteeNotice: string;
    readonly scenario: "canonical-baseline";
    readonly units: "kWh per 3600-second record; battery state in kWh";
  };
  readonly hours: readonly SunlitHour[];
}

/** Strict calendar parsing, without Date's rollover of impossible dates. */
export function isSunlitDateUtc(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp)
    && new Date(timestamp).toISOString().slice(0, 10) === value;
}
