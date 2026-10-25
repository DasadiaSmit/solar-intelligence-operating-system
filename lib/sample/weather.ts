import type {
  LocationConfig,
  SystemConfig,
  WeatherHour,
} from "../contracts/index";
import { makeQuality } from "../contracts/index";
import { calculateClearSkyIrradiance, calculateSolarPosition } from "../solar/solar-position";
import { clamp, mulberry32 } from "../solar/math";

export const SAMPLE_YEARS = [2022, 2023, 2024, 2025] as const;
export type SampleYear = (typeof SAMPLE_YEARS)[number];

export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

interface WeatherScenarioModifiers {
  cloud: number;
  temperatureC: number;
  wind: number;
  irradiance: number;
}

const YEAR_MODIFIERS: Record<SampleYear, WeatherScenarioModifiers> = {
  2022: { cloud: -0.065, temperatureC: 1.0, wind: 0.93, irradiance: 1.035 },
  2023: { cloud: 0.025, temperatureC: 0.45, wind: 1.04, irradiance: 0.99 },
  2024: { cloud: 0.055, temperatureC: 0.7, wind: 1.08, irradiance: 0.975 },
  2025: { cloud: -0.015, temperatureC: 0.85, wind: 0.98, irradiance: 1.01 },
};

function scenarioModifiers(
  scenario: SystemConfig["weatherScenario"],
): WeatherScenarioModifiers {
  if (scenario === "sunny") return { cloud: -0.18, temperatureC: 1.8, wind: 0.9, irradiance: 1.06 };
  if (scenario === "cloudy") return { cloud: 0.2, temperatureC: -0.4, wind: 1.08, irradiance: 0.88 };
  if (scenario === "heatwave") return { cloud: -0.12, temperatureC: 6.5, wind: 0.72, irradiance: 1.04 };
  if (scenario === "storm") return { cloud: 0.28, temperatureC: -1.8, wind: 1.65, irradiance: 0.78 };
  return { cloud: 0, temperatureC: 0, wind: 1, irradiance: 1 };
}

function isoHour(year: number, month: number, day: number, hour: number): string {
  return new Date(Date.UTC(year, month - 1, day, hour, 30)).toISOString();
}

/**
 * Deterministic proving dataset. It is generated from physical clear-sky
 * envelopes plus correlated weather regimes and is always labelled simulated.
 * February 29 is intentionally omitted to keep every comparison year at 8760 h.
 */
export function generateSampleWeatherYear(
  year: SampleYear,
  location: LocationConfig,
  seed = 1,
  scenario: SystemConfig["weatherScenario"] = "representative",
): WeatherHour[] {
  const random = mulberry32((seed ^ (year * 2_654_435_761)) >>> 0);
  const annual = YEAR_MODIFIERS[year];
  const scenarioChange = scenarioModifiers(scenario);
  const hours = new Array<WeatherHour>(8760);
  let index = 0;
  let dayOfYear = 0;
  let cloudState = clamp(0.55 + annual.cloud, 0.05, 0.95);
  let snowReservoirCm = 0;

  for (let monthIndex = 0; monthIndex < DAYS_IN_MONTH.length; monthIndex += 1) {
    const month = monthIndex + 1;
    const days = DAYS_IN_MONTH[monthIndex] ?? 0;
    for (let day = 1; day <= days; day += 1) {
      dayOfYear += 1;
      const seasonalAngle = 2 * Math.PI * (dayOfYear - 172) / 365;
      const synopticWave =
        0.16 * Math.sin(2 * Math.PI * dayOfYear / 9.7 + year) +
        0.11 * Math.sin(2 * Math.PI * dayOfYear / 23.5 + year * 0.17);
      for (let hour = 0; hour < 24; hour += 1) {
        const timestamp = isoHour(year, month, day, hour);
        // Preserve a common no-leap modelling ordinal while deriving solar
        // geometry from the real UTC timestamp (notably after 29 February in
        // the 2024 source calendar).
        const position = calculateSolarPosition(timestamp, location);
        const clearSky = calculateClearSkyIrradiance(position, location.elevationM);
        const weatherNoise = (random() - 0.5) * 0.32;
        const targetCloud = clamp(
          0.53 + annual.cloud + scenarioChange.cloud + synopticWave + weatherNoise,
          0.015,
          0.99,
        );
        cloudState = clamp(0.78 * cloudState + 0.22 * targetCloud, 0.01, 0.995);

        const diurnalTemperature = 3.2 * Math.sin(2 * Math.PI * (hour - 9) / 24);
        const temperatureC =
          10.8 -
          7.4 * Math.cos(seasonalAngle) +
          diurnalTemperature +
          annual.temperatureC +
          scenarioChange.temperatureC +
          (random() - 0.5) * 1.4;
        const windSpeedMps = clamp(
          (3.7 + 1.3 * Math.cos(seasonalAngle) + 2.8 * Math.max(0, cloudState - 0.65) +
            (random() - 0.5) * 2.4) *
            annual.wind *
            scenarioChange.wind,
          0.15,
          24,
        );
        const precipitationChance = clamp((cloudState - 0.64) * 1.9, 0, 0.82);
        const precipitationMm =
          random() < precipitationChance
            ? Math.max(0, (cloudState - 0.58) * (0.4 + random() * 3.8))
            : 0;
        if (temperatureC < 1 && precipitationMm > 0) {
          snowReservoirCm += precipitationMm * 0.65;
        } else {
          snowReservoirCm = Math.max(0, snowReservoirCm - Math.max(0, temperatureC) * 0.016);
        }
        const snowDepthCm = clamp(snowReservoirCm, 0, 24);
        const relativeHumidityPct = clamp(
          58 + cloudState * 34 + precipitationMm * 3 - Math.max(0, temperatureC - 17) * 0.8,
          30,
          100,
        );
        const cloudTransmittance = clamp(
          1 - 0.76 * cloudState ** 1.55,
          0.12,
          1,
        );
        const irradianceScale = annual.irradiance * scenarioChange.irradiance;
        const ghiWm2 = clamp(
          clearSky.ghiWm2 * cloudTransmittance * irradianceScale,
          0,
          clearSky.ghiWm2 * 1.08,
        );
        const directFraction = clamp((1 - cloudState) ** 1.75, 0, 1);
        const dniWm2 = clamp(clearSky.dniWm2 * directFraction * irradianceScale, 0, 1150);
        const horizontalDirect =
          dniWm2 * Math.max(0, Math.cos(position.zenithDeg * Math.PI / 180));
        const dhiWm2 = Math.max(0, ghiWm2 - horizontalDirect);
        const albedo = snowDepthCm > 0.5 ? 0.58 : clamp(0.19 + precipitationMm * 0.01, 0.16, 0.28);
        const quality = makeQuality(
          0.9,
          ["deterministic-sample", "simulated-not-observed", "no-leap-normalisation"],
          1,
          false,
        );

        hours[index] = {
          timestamp,
          sourceTimestamp: timestamp,
          sourceYear: year,
          dayOfYear,
          month,
          day,
          hour,
          temperatureC,
          windSpeedMps,
          relativeHumidityPct,
          cloudCoverPct: cloudState * 100,
          precipitationMm,
          snowDepthCm,
          surfacePressureHpa: 1013.25 * Math.exp(-location.elevationM / 8434.5),
          albedo,
          ghiWm2,
          dniWm2,
          dhiWm2,
          quality,
        };
        index += 1;
      }
    }
  }
  return hours;
}

export function generateHistoricalSample(
  location: LocationConfig,
  seed = 1,
  scenario: SystemConfig["weatherScenario"] = "representative",
): Record<SampleYear, WeatherHour[]> {
  return {
    2022: generateSampleWeatherYear(2022, location, seed, scenario),
    2023: generateSampleWeatherYear(2023, location, seed, scenario),
    2024: generateSampleWeatherYear(2024, location, seed, scenario),
    2025: generateSampleWeatherYear(2025, location, seed, scenario),
  };
}
