import type {
  AnnualEnergyViewV1,
} from "@/features/visual-computing/annual-energy-view";
import styles from "./Observatory.module.css";

export interface AnnualEnergyReadoutProps {
  readonly limitationId: string;
  readonly view: AnnualEnergyViewV1;
}

function number(value: number, digits = 1): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: digits,
  }).format(value);
}

const SEASON_LABELS = {
  winter: "Winter",
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
} as const;

const SEASON_TONE_LABELS = {
  winter: "blue-grey",
  spring: "green",
  summer: "gold",
  autumn: "copper",
} as const;

function sourceYears(years: readonly number[]): string {
  return years.join(", ");
}

export function AnnualEnergyReadout({
  limitationId,
  view,
}: AnnualEnergyReadoutProps) {
  return (
    <>
      <p
        className={styles.instrumentSummary}
        data-empirical-basis={view.empiricalSpread.basis}
        data-calibrated-probabilistic-interval={String(
          view.empiricalSpread.calibratedProbabilisticInterval,
        )}
        data-forecast-guarantee={String(
          view.empiricalSpread.forecastGuarantee,
        )}
      >
        Simulated annual generation across one no-leap, hourly
        representative year. Clockwise position is chronology, radial
        displacement is hourly AC energy relative to the annual peak, and
        muted colour identifies meteorological season. The P10/P50/P90
        values are empirical ordered percentiles of four source-year annual
        totals, not a calibrated probabilistic forecast interval, issued
        forecast, or generation guarantee.
      </p>
      <dl className={styles.instrumentFacts}>
        <div>
          <dt>Status</dt>
          <dd>{view.lifecycle}</dd>
        </div>
        <div>
          <dt>Annual generation</dt>
          <dd>
            {number(view.summary.annualGenerationKWh, 1)}{" "}
            {view.units.annualEnergy}
          </dd>
        </div>
        <div>
          <dt>Peak AC / configured DC</dt>
          <dd>
            {number(view.summary.peakAcKw, 2)}{" "}
            {view.units.peakPower} /{" "}
            {number(view.summary.capacityKwDc, 1)}{" "}
            {view.units.arrayCapacity}
          </dd>
        </div>
        <div>
          <dt>Specific yield</dt>
          <dd>
            {number(view.summary.specificYieldKWhPerKwp, 1)}{" "}
            {view.units.specificYield}
          </dd>
        </div>
        <div>
          <dt>Annual sample</dt>
          <dd>
            8,760 hourly records ·{" "}
            {number(view.calendar.intervalSeconds, 0)} seconds each ·{" "}
            {view.calendar.calendarYearUtc} UTC ·{" "}
            {view.calendar.noLeap ? "no-leap calendar" : "leap calendar"}
          </dd>
        </div>
        {view.seasons.map((season) => (
          <div key={season.season}>
            <dt>{SEASON_LABELS[season.season]} generation</dt>
            <dd>
              {number(season.generationKWh, 1)}{" "}
              {view.units.annualEnergy} ·{" "}
              {SEASON_TONE_LABELS[season.season]} samples
            </dd>
          </div>
        ))}
        <div>
          <dt>Annual mean quality</dt>
          <dd>
            {number(view.summary.annualMeanQualityScore, 3)}{" "}
            {view.units.quality}
          </dd>
        </div>
        <div>
          <dt>Representative year</dt>
          <dd>
            {view.representativeYear.id} · method{" "}
            {view.representativeYear.method} · source years{" "}
            {sourceYears(view.representativeYear.sourceYears)}
          </dd>
        </div>
        <div>
          <dt>Empirical P10 / P50 / P90</dt>
          <dd>
            {number(view.empiricalSpread.p10KWh, 1)} /{" "}
            {number(view.empiricalSpread.p50KWh, 1)} /{" "}
            {number(view.empiricalSpread.p90KWh, 1)}{" "}
            {view.units.annualEnergy}
          </dd>
        </div>
        <div>
          <dt>Empirical spread basis</dt>
          <dd>
            Source years{" "}
            {sourceYears(view.empiricalSpread.sourceYears)} ·{" "}
            {view.empiricalSpread.quantileMethod}
          </dd>
        </div>
      </dl>
      <p className={styles.provenanceLine}>
        {view.provenance.provider} · dataset{" "}
        {view.provenance.datasetVersion} · calculation{" "}
        {view.provenance.calculationVersion} ·{" "}
        {view.provenance.evidenceRefIds.length} evidence references
        <span className={styles.screenReaderOnly}>
          {` Evidence references: ${view.provenance.evidenceRefIds.join(", ")}.`}
        </span>
      </p>
      <p
        id={limitationId}
        className={styles.readoutLimitation}
      >
        This is simulated representative-year output, not measured or live
        plant production and not an issued future forecast. Hourly samples do
        not resolve intra-hour variation. Four source years do not establish
        climate causality. No spatial generation field is synthesized.
      </p>
    </>
  );
}
