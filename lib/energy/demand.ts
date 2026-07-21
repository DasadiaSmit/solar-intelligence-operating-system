import type { DemandConfig, WeatherHour } from "../contracts/index";

function hourlyWeight(hour: WeatherHour, config: DemandConfig): number {
  if (config.profile === "flat") return 1;
  const weekday = new Date(hour.timestamp).getUTCDay();
  const isWeekend = weekday === 0 || weekday === 6;
  const weekend = isWeekend ? config.weekendFraction : 1;
  const winter = 1 + 0.13 * Math.cos(2 * Math.PI * (hour.dayOfYear - 15) / 365);
  if (config.profile === "commercial") {
    const occupied = hour.hour >= 8 && hour.hour < 18;
    const shoulder = (hour.hour >= 6 && hour.hour < 8) || (hour.hour >= 18 && hour.hour < 21);
    return winter * weekend * (occupied ? 1.55 : shoulder ? 0.78 : 0.37);
  }
  const morning = Math.exp(-(((hour.hour - 7) / 2.1) ** 2));
  const evening = Math.exp(-(((hour.hour - 19) / 2.8) ** 2));
  const base = 0.38 + 0.52 * morning + 0.92 * evening;
  return winter * (isWeekend ? 0.96 + 0.16 * Math.exp(-(((hour.hour - 12) / 4) ** 2)) : 1) * base;
}

export function buildDemandProfile(
  weather: readonly WeatherHour[],
  config: DemandConfig,
): number[] {
  const weights = weather.map((hour) => Math.max(0, hourlyWeight(hour, config)));
  const totalWeight = weights.reduce((total, value) => total + value, 0);
  if (totalWeight <= 0) return weights.map(() => 0);
  const scale = Math.max(0, config.annualDemandKWh) / totalWeight;
  return weights.map((weight) => weight * scale);
}
