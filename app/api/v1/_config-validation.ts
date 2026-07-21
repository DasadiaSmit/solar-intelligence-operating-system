import type { SystemConfig } from "@/lib/contracts";
import { ProviderError } from "@/lib/providers";

type RecordValue = Record<string, unknown>;

export function validateSystemConfigPatch(value: unknown): Partial<SystemConfig> {
  const source = object(value, "config");
  const result: RecordValue = {};
  if (source.location !== undefined) {
    const location = object(source.location, "location");
    result.location = {
      ...(location.id === undefined ? {} : { id: shortText(location.id, "location.id", 80) }),
      ...(location.name === undefined ? {} : { name: shortText(location.name, "location.name", 120) }),
      ...(location.latitude === undefined
        ? {}
        : { latitude: number(location.latitude, "location.latitude", -90, 90) }),
      ...(location.longitude === undefined
        ? {}
        : { longitude: number(location.longitude, "location.longitude", -180, 180) }),
      ...(location.elevationM === undefined
        ? {}
        : { elevationM: number(location.elevationM, "location.elevationM", -500, 9_000) }),
      ...(location.timezone === undefined
        ? {}
        : { timezone: shortText(location.timezone, "location.timezone", 80) }),
      ...(location.standardUtcOffsetMinutes === undefined
        ? {}
        : {
            standardUtcOffsetMinutes: number(
              location.standardUtcOffsetMinutes,
              "location.standardUtcOffsetMinutes",
              -840,
              840,
            ),
          }),
    };
  }
  if (source.array !== undefined) {
    const array = object(source.array, "array");
    result.array = pickNumbers(array, "array", {
      capacityKwDc: [0.1, 1_000_000],
      tiltDeg: [0, 90],
      azimuthDeg: [-180, 180],
      maxTrackerTiltDeg: [0, 90],
      bifaciality: [0, 1],
      temperatureCoefficientPerC: [-0.02, 0],
      degradationPerYear: [0, 0.1],
      systemAgeYears: [0, 80],
      dcAcRatio: [0.5, 3],
      inverterEfficiency: [0.5, 1],
    });
    if (array.tracking !== undefined) {
      (result.array as RecordValue).tracking = enumValue(
        array.tracking,
        "array.tracking",
        ["fixed", "single-axis", "dual-axis"],
      );
    }
    if (array.panelTechnology !== undefined) {
      (result.array as RecordValue).panelTechnology = enumValue(
        array.panelTechnology,
        "array.panelTechnology",
        ["mono-p", "mono-n", "thin-film", "bifacial-mono-n"],
      );
    }
  }
  if (source.losses !== undefined) {
    const losses = object(source.losses, "losses");
    result.losses = pickNumbers(losses, "losses", {
      horizon: [0, 1],
      shading: [0, 1],
      soiling: [0, 1],
      dust: [0, 1],
      snow: [0, 1],
      mismatch: [0, 1],
      wiring: [0, 1],
      strings: [0, 1],
      availability: [0, 1],
      curtailment: [0, 1],
    });
  }
  if (source.battery !== undefined) {
    const battery = object(source.battery, "battery");
    result.battery = pickNumbers(battery, "battery", {
      capacityKWh: [0, 10_000_000],
      maxChargeKw: [0, 1_000_000],
      maxDischargeKw: [0, 1_000_000],
      minSocFraction: [0, 1],
      maxSocFraction: [0, 1],
      initialSocFraction: [0, 1],
      chargeEfficiency: [0.5, 1],
      dischargeEfficiency: [0.5, 1],
      selfDischargePerHour: [0, 0.1],
      reserveFraction: [0, 1],
    });
    if (battery.enabled !== undefined) {
      (result.battery as RecordValue).enabled = boolean(battery.enabled, "battery.enabled");
    }
  }
  if (source.tariff !== undefined) {
    const tariff = object(source.tariff, "tariff");
    result.tariff = pickNumbers(tariff, "tariff", {
      importPricePerKWh: [0, 100],
      peakImportPricePerKWh: [0, 100],
      peakStartHour: [0, 23],
      peakEndHour: [0, 24],
      exportPricePerKWh: [-100, 100],
      annualFixedCost: [0, 100_000_000],
      gridExportLimitKw: [0, 1_000_000],
    });
    if (tariff.currency !== undefined) {
      (result.tariff as RecordValue).currency = enumValue(tariff.currency, "tariff.currency", [
        "GBP",
        "EUR",
        "USD",
      ]);
    }
  }
  if (source.demand !== undefined) {
    const demand = object(source.demand, "demand");
    result.demand = pickNumbers(demand, "demand", {
      annualDemandKWh: [0, 10_000_000_000],
      weekendFraction: [0, 2],
    });
    if (demand.profile !== undefined) {
      (result.demand as RecordValue).profile = enumValue(demand.profile, "demand.profile", [
        "residential",
        "commercial",
        "flat",
      ]);
    }
  }
  if (source.carbon !== undefined) {
    result.carbon = pickNumbers(object(source.carbon, "carbon"), "carbon", {
      gridIntensityKgCo2ePerKWh: [0, 5],
      exportDisplacementFactor: [0, 2],
      embodiedCarbonKgCo2ePerKwp: [0, 100_000],
    });
  }
  if (source.weatherScenario !== undefined) {
    result.weatherScenario = enumValue(source.weatherScenario, "weatherScenario", [
      "representative",
      "sunny",
      "cloudy",
      "heatwave",
      "storm",
    ]);
  }
  if (source.seed !== undefined) result.seed = Math.round(number(source.seed, "seed", 0, 2_147_483_647));
  return result as Partial<SystemConfig>;
}

function pickNumbers(
  source: RecordValue,
  prefix: string,
  bounds: Record<string, [number, number]>,
): RecordValue {
  const result: RecordValue = {};
  for (const [key, [minimum, maximum]] of Object.entries(bounds)) {
    if (source[key] !== undefined) result[key] = number(source[key], `${prefix}.${key}`, minimum, maximum);
  }
  return result;
}

function object(value: unknown, name: string): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(`${name} must be an object.`);
  return value as RecordValue;
}

function number(value: unknown, name: string, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    invalid(`${name} must be a finite number between ${minimum} and ${maximum}.`);
  }
  return value;
}

function boolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") invalid(`${name} must be a boolean.`);
  return value;
}

function shortText(value: unknown, name: string, maximum: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    invalid(`${name} must be non-empty text of at most ${maximum} characters.`);
  }
  return value.trim();
}

function enumValue<T extends string>(value: unknown, name: string, values: readonly T[]): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    invalid(`${name} must be one of: ${values.join(", ")}.`);
  }
  return value as T;
}

function invalid(message: string): never {
  throw new ProviderError(message, { code: "INVALID_QUERY" });
}

