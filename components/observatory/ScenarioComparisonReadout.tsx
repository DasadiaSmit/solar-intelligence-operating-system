import type {
  ScenarioComparisonViewV1,
} from "@/features/visual-computing/scenario-comparison-view";
import styles from "./Observatory.module.css";

export interface ScenarioComparisonReadoutProps {
  readonly limitationId: string;
  readonly view: ScenarioComparisonViewV1;
}

const UNAVAILABLE_LAYER_LABELS = [
  [
    "sunnyAndCloudyParallelRuns",
    "Parallel sunny and cloudy annual runs",
  ],
  ["dustEventDynamics", "Dust-event dynamics"],
  ["hourlyStressTrajectories", "Serialized hourly stress trajectories"],
  ["scenarioProbabilities", "Scenario probabilities"],
  [
    "stormDamageAndStructuralRisk",
    "Storm damage and structural risk",
  ],
  [
    "heatwaveThresholdAndAttribution",
    "Validated heatwave threshold, return period, or attribution",
  ],
  [
    "stormMeteorology",
    "Observed storm classification, gusts, direction, lightning, or cloud geometry",
  ],
  [
    "spatialMicroclimateTerrainAndShadows",
    "Spatial microclimate, terrain, obstructions, and physical shadows",
  ],
  ["measuredOrLiveResponse", "Measured or live plant response"],
  ["issuedForecast", "Issued weather or production forecast"],
] as const satisfies readonly (
  readonly [
    keyof ScenarioComparisonViewV1["unavailableLayers"],
    string,
  ]
)[];

function number(value: number, digits = 1): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: digits,
  }).format(value);
}

function signed(value: number, unit: "%" | " pp"): string {
  return `${value >= 0 ? "+" : ""}${number(value, 3)}${unit}`;
}

function currency(
  value: number,
  code: ScenarioComparisonViewV1[
    "metricDefinitions"
  ]["energyValueCurrency"],
): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(value);
}

export function ScenarioComparisonReadout({
  limitationId,
  view,
}: ScenarioComparisonReadoutProps) {
  const currencyCode = view.metricDefinitions.energyValueCurrency;
  return (
    <>
      <p
        className={styles.instrumentSummary}
        data-comparison-boundary={view.comparisonBoundary.kind}
        data-comparison-mode={view.comparisonBoundary.mode}
        data-deterministic={String(view.comparisonBoundary.deterministic)}
        data-issued-forecast={String(
          view.comparisonBoundary.issuedForecast,
        )}
      >
        <strong>SIMULATED deterministic comparison</strong> of one
        configured baseline and four canonical stress calculations. The five
        chambers are presented together for comparison; they are not five
        observed or same-time weather systems, hourly stress trajectories, or
        independently forecast worlds, and carry no occurrence probabilities.
      </p>
      <p className={styles.instrumentSummary}>
        The spatial response column encodes signed annual-generation delta,
        normalized to the largest absolute delta in this five-chamber set;
        its midpoint is the configured baseline. It is a comparison scale,
        not a physical height. Exact energy, screened annual energy value,
        local supply, assumptions, and deltas remain authoritative in this
        HTML table.
      </p>
      <dl className={styles.instrumentFacts}>
        <div>
          <dt>Comparison basis</dt>
          <dd>
            {number(view.chambers.length, 0)} chambers ·{" "}
            {number(view.chronology.recordCount, 0)} hourly records ·{" "}
            {number(view.chronology.intervalSeconds, 0)} seconds ·{" "}
            {view.chronology.calendar}
          </dd>
        </div>
        <div>
          <dt>Optimisation lifecycle</dt>
          <dd>
            {view.optimisation.status} · frame {view.lifecycle}
          </dd>
        </div>
        <div>
          <dt>Method</dt>
          <dd>{view.optimisation.method}</dd>
        </div>
        <div>
          <dt>Objective</dt>
          <dd>{view.optimisation.objective}</dd>
        </div>
        <div>
          <dt>Annual data quality</dt>
          <dd>{number(view.annualQualityScore, 3)}</dd>
        </div>
        <div>
          <dt>Delta definitions</dt>
          <dd>
            Generation: percent of configured baseline · energy value:
            percent of the absolute configured-baseline value · local supply:
            percentage points
          </dd>
        </div>
      </dl>
      <div className={styles.comparisonTableRegion}>
        <table className={styles.comparisonTable}>
          <caption>
            Configured baseline and deterministic annual stress comparison
          </caption>
          <thead>
            <tr>
              <th scope="col">Chamber</th>
              <th scope="col">Annual generation</th>
              <th scope="col">Generation delta</th>
              <th scope="col">Screened energy value</th>
              <th scope="col">Value delta</th>
              <th scope="col">Local supply</th>
              <th scope="col">Supply delta</th>
            </tr>
          </thead>
          <tbody>
            {view.chambers.map((chamber) => (
              <tr key={chamber.id}>
                <th scope="row">
                  <strong>{chamber.label}</strong>
                  <span>{chamber.explanation}</span>
                </th>
                <td>{number(chamber.annualGenerationKWh, 1)} kWh</td>
                <td>
                  {chamber.role === "baseline"
                    ? "reference"
                    : signed(chamber.generationDeltaPct, "%")}
                </td>
                <td>
                  {currency(chamber.netEnergyValue, currencyCode)} / year
                </td>
                <td>
                  {chamber.role === "baseline"
                    ? "reference"
                    : signed(chamber.energyValueDeltaPct, "%")}
                </td>
                <td>{number(chamber.localSupplyPct, 3)}%</td>
                <td>
                  {chamber.role === "baseline"
                    ? "reference"
                    : signed(
                        chamber.localSupplyDeltaPercentagePoints,
                        " pp",
                      )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.instrumentSummary}>
        The source field named <code>reliabilityDeltaPct</code> calculates
        change in local energy supply. It is therefore reported here as
        percentage points of local supply, not as equipment availability,
        outage probability, or guaranteed reliability.
      </p>
      <p className={styles.provenanceLine}>
        {view.provenance.provider} · dataset{" "}
        {view.provenance.datasetVersion} · calculation{" "}
        {view.provenance.calculationVersion} · scenario{" "}
        {view.provenance.scenarioVersion} · evidence{" "}
        {view.provenance.evidenceRefIds.join(", ")}
      </p>
      <section
        id={limitationId}
        className={styles.readoutLimitation}
        aria-label="Scenario Comparison unavailable layers"
      >
        <p>
          <strong>Unavailable and not synthesized:</strong>
        </p>
        <ul>
          {UNAVAILABLE_LAYER_LABELS.map(([key, label]) => (
            <li key={key}>
              <strong>{label}:</strong>{" "}
              {view.unavailableLayers[key].reason}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
