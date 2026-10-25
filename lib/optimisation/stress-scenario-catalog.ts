import type { LifecycleStatus } from "../contracts";

export const DETERMINISTIC_STRESS_SCENARIO_CATALOG = Object.freeze([
  Object.freeze({
    id: "summer-heatwave",
    label: "Extended summer heatwave",
    status: "simulated",
    explanation:
      "June–August ambient temperature +6 °C and irradiance +2%; thermal derating is resolved hourly.",
  }),
  Object.freeze({
    id: "atlantic-storm-week",
    label: "Atlantic storm week",
    status: "simulated",
    explanation:
      "Seven autumn days receive 72% radiation attenuation and elevated wind.",
  }),
  Object.freeze({
    id: "snow-cover",
    label: "Persistent snow cover",
    status: "simulated",
    explanation:
      "Eight winter days impose at least 6 cm snow depth, activating the snow-loss model.",
  }),
  Object.freeze({
    id: "inverter-outage",
    label: "Seven-day inverter outage",
    status: "simulated",
    explanation:
      "AC production is set to zero for seven July days after physical simulation.",
  }),
] as const satisfies readonly {
  readonly id: string;
  readonly label: string;
  readonly status: LifecycleStatus;
  readonly explanation: string;
}[]);

export type DeterministicStressScenarioId =
  typeof DETERMINISTIC_STRESS_SCENARIO_CATALOG[number]["id"];
