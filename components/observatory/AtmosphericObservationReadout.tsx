import type {
  AtmosphericObservationViewV1,
} from "@/features/visual-computing/atmospheric-observation-view";
import styles from "./Observatory.module.css";

export interface AtmosphericObservationReadoutProps {
  readonly limitationId: string;
  readonly view: AtmosphericObservationViewV1;
}

function number(value: number, digits = 1): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: digits,
  }).format(value);
}

function linkedTime(timestampUtc: string): string {
  const date = new Date(timestampUtc);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(date)
    : timestampUtc;
}

export function AtmosphericObservationReadout({
  limitationId,
  view,
}: AtmosphericObservationReadoutProps) {
  return (
    <>
      <p
        className={styles.instrumentSummary}
        data-temporal-basis={view.relationship.temporalBasis}
        data-causality-claim={String(view.relationship.causalityClaim)}
      >
        Schematic atmospheric state for one coincident hourly interval.
        Weather, irradiance, and modelled AC energy share a linked time;
        their co-variation is not proof of instant causality.
      </p>
      <dl className={styles.instrumentFacts}>
        <div>
          <dt>Linked time</dt>
          <dd>{linkedTime(view.timestampUtc)} UTC</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{view.lifecycle}</dd>
        </div>
        <div>
          <dt>Cloud / humidity</dt>
          <dd>
            {number(view.weather.cloudCoverPct, 1)}
            {view.units.cloudCover} /{" "}
            {number(view.weather.relativeHumidityPct, 1)}
            {view.units.relativeHumidity}
          </dd>
        </div>
        <div>
          <dt>Wind speed / temperature</dt>
          <dd>
            {number(view.weather.windSpeedMps, 2)}{" "}
            {view.units.windSpeed} /{" "}
            {number(view.weather.ambientTemperatureC, 1)}{" "}
            {view.units.ambientTemperature}
          </dd>
        </div>
        <div>
          <dt>GHI / DNI / DHI</dt>
          <dd>
            {number(view.irradiance.ghiWm2, 0)} /{" "}
            {number(view.irradiance.dniWm2, 0)} /{" "}
            {number(view.irradiance.dhiWm2, 0)}{" "}
            {view.units.irradiance}
          </dd>
        </div>
        <div>
          <dt>Effective POA / AC energy</dt>
          <dd>
            {number(view.irradiance.effectivePoaWm2, 0)}{" "}
            {view.units.irradiance} /{" "}
            {number(view.energy.acEnergyKWh, 2)}{" "}
            {view.units.acEnergy}
          </dd>
        </div>
        <div>
          <dt>Configured capacity</dt>
          <dd>
            {number(view.array.capacityKwDc, 1)}{" "}
            {view.units.arrayCapacity}
          </dd>
        </div>
        <div>
          <dt>Data quality</dt>
          <dd>
            {number(view.quality.score, 3)} {view.units.quality} ·{" "}
            {view.quality.level} · completeness{" "}
            {number(view.quality.completeness, 3)}{" "}
            {view.units.quality} · imputed{" "}
            {view.quality.imputed ? "yes" : "no"}
            {view.quality.flags.length > 0
              ? ` · ${view.quality.flags.join(", ")}`
              : ""}
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
        Unavailable and not synthesized: wind direction; cloud geometry,
        altitude, type, and motion; sub-hour response; and measured or live
        plant output. This hourly frame does not claim live synchronization
        or instant cloud-to-power causality.
      </p>
    </>
  );
}
