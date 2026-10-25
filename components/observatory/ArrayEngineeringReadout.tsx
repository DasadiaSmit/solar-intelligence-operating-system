import {
  ARRAY_ENGINEERING_LOSS_KEYS,
  type ArrayEngineeringScreeningControl,
} from "@/features/visual-computing/array-engineering-frame";
import type {
  ArrayEngineeringViewV1,
} from "@/features/visual-computing/array-engineering-view";
import styles from "./Observatory.module.css";

export interface ArrayEngineeringReadoutProps {
  readonly limitationId: string;
  readonly view: ArrayEngineeringViewV1;
}

const SCREENING_CONTROL_LABELS: Readonly<
  Record<ArrayEngineeringScreeningControl, string>
> = Object.freeze({
  capacityKwDc: "DC capacity",
  tiltDeg: "panel tilt",
  azimuthDeg: "panel azimuth",
  aggregateSystemLossPct: "aggregate system loss",
});

const UNAVAILABLE_LAYER_LABELS = [
  ["moduleCountAndRating", "Module count and rated module power"],
  ["physicalArrayAndRowGeometry", "Physical array and row geometry"],
  ["namedInverterAndCurve", "Named inverter and performance curve"],
  ["moduleEfficiency", "Module efficiency"],
  ["editableInverterEfficiency", "Editable inverter efficiency"],
  ["physicalShadowField", "Physical shadow field"],
  ["terrain", "Terrain"],
  ["surveyedHorizon", "Surveyed horizon"],
  ["candidateHourlyProduction", "Candidate hourly production"],
  ["measuredOrLiveOutput", "Measured or live output"],
  [
    "authoritativeClientSideRecalculation",
    "Authoritative client-side recalculation",
  ],
] as const satisfies readonly (
  readonly [
    keyof ArrayEngineeringViewV1["unavailableLayers"],
    string,
  ]
)[];

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

function screeningControlValue(
  view: ArrayEngineeringViewV1,
  control: ArrayEngineeringScreeningControl,
): string {
  switch (control) {
    case "capacityKwDc":
      return `${number(view.array.configured.capacityKwDc, 1)} kW DC`;
    case "tiltDeg":
      return `${number(view.array.configured.tiltDeg, 1)}°`;
    case "azimuthDeg":
      return `${number(view.array.configured.azimuthDeg, 1)}°`;
    case "aggregateSystemLossPct":
      return `${number(view.screening.aggregateSystemLossPct, 2)}%`;
  }
}

export function ArrayEngineeringReadout({
  limitationId,
  view,
}: ArrayEngineeringReadoutProps) {
  return (
    <>
      <p
        className={styles.instrumentSummary}
        data-configuration-boundary={view.configurationBoundary.kind}
        data-screening-status={view.screening.status}
        data-bankable-yield-assessment={String(
          view.screening.bankableYieldAssessment,
        )}
      >
        <strong>SIMULATED screening</strong> of the fixed canonical base
        configuration; linked frame lifecycle: {view.lifecycle}. The existing
        HTML controls are screening controls only; they do not perform an
        authoritative server recalculation or constitute a bankable yield
        assessment.
      </p>
      <p className={styles.instrumentSummary}>
        Array settings never alter the astronomical Sun path. They change
        only the configured array orientation and its incidence relationship
        to that independently calculated path.
      </p>
      <dl className={styles.instrumentFacts}>
        <div>
          <dt>Linked interval</dt>
          <dd>
            {linkedTime(view.linkedInterval.timestampUtc)} UTC · row{" "}
            {number(view.linkedInterval.selectedIndex + 1, 0)} ·{" "}
            {number(view.linkedInterval.intervalSeconds, 0)} seconds
          </dd>
        </div>
        <div>
          <dt>Configured DC capacity</dt>
          <dd>{number(view.array.configured.capacityKwDc, 1)} kW DC</dd>
        </div>
        <div>
          <dt>Configured orientation</dt>
          <dd>
            {number(view.array.configured.tiltDeg, 2)}° tilt ·{" "}
            {number(view.array.configured.azimuthDeg, 2)}° azimuth
          </dd>
        </div>
        <div>
          <dt>Resolved orientation</dt>
          <dd>
            {number(view.array.resolved.tiltDeg, 2)}° tilt ·{" "}
            {number(view.array.resolved.azimuthDeg, 2)}° azimuth
          </dd>
        </div>
        <div>
          <dt>Configured array basis</dt>
          <dd>
            {view.array.configured.tracking} tracking ·{" "}
            {view.array.configured.panelTechnology} technology
          </dd>
        </div>
        <div>
          <dt>Generic inverter facts (fixed)</dt>
          <dd>
            {number(view.array.configured.dcAcRatio, 3)} DC/AC ratio ·{" "}
            {number(view.array.configured.inverterEfficiency * 100, 2)}%
            efficiency · {number(view.generation.acCapacityKw, 2)} kW AC
            capacity. No named inverter or performance curve is configured.
          </dd>
        </div>
        <div>
          <dt>Linked Sun position</dt>
          <dd>
            {number(view.sun.position.apparentElevationDeg, 2)}° apparent
            elevation · {number(view.sun.position.azimuthDeg, 2)}° azimuth ·{" "}
            {view.sun.position.isDaylight ? "daylight" : "below horizon"}
          </dd>
        </div>
        <div>
          <dt>Linked angle of incidence</dt>
          <dd>
            {number(view.irradiance.angleOfIncidenceDeg, 2)}° · modifier{" "}
            {number(view.irradiance.incidenceAngleModifier, 4)}
          </dd>
        </div>
        <div>
          <dt>Linked POA irradiance</dt>
          <dd>
            {number(view.irradiance.effectiveWm2, 1)} W/m² effective ·{" "}
            {number(view.irradiance.globalWm2, 1)} global ·{" "}
            {number(view.irradiance.directWm2, 1)} direct ·{" "}
            {number(view.irradiance.diffuseWm2, 1)} diffuse ·{" "}
            {number(view.irradiance.reflectedWm2, 1)} reflected ·{" "}
            {number(view.irradiance.rearWm2, 1)} rear
          </dd>
        </div>
        <div>
          <dt>Linked AC output</dt>
          <dd>
            {number(view.generation.acKWh, 3)} kWh in the one-hour interval ·{" "}
            {number(view.generation.performanceRatio * 100, 2)}% hourly
            performance ratio
          </dd>
        </div>
        <div>
          <dt>Annual result</dt>
          <dd>
            {number(view.annual.summary.annualGenerationKWh, 1)} kWh ·{" "}
            {number(view.annual.summary.specificYieldKWhPerKwp, 1)}{" "}
            kWh/kWp · {number(view.annual.summary.performanceRatioPct, 2)}%
            performance ratio · {number(view.annual.summary.peakAcKw, 2)} kW
            peak AC
          </dd>
        </div>
        <div>
          <dt>Data quality</dt>
          <dd>
            {number(view.quality.score, 3)} · {view.quality.level} ·
            completeness {number(view.quality.completeness, 3)} · imputed{" "}
            {view.quality.imputed ? "yes" : "no"}
            {view.quality.flags.length > 0
              ? ` · ${view.quality.flags.join(", ")}`
              : " · no quality flags"}
          </dd>
        </div>
        <div>
          <dt>Editable HTML screening controls</dt>
          <dd>
            {view.screening.supportedHtmlControls.map((control, index) => (
              <span key={control}>
                {index > 0 ? " · " : ""}
                {SCREENING_CONTROL_LABELS[control]}{" "}
                {screeningControlValue(view, control)}
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt>Configured component loss inputs</dt>
          <dd>
            {ARRAY_ENGINEERING_LOSS_KEYS.map((key, index) => (
              <span key={key}>
                {index > 0 ? " · " : ""}
                {key} {number(view.configuredLosses[key] * 100, 2)}%
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt>Annual canonical loss chain</dt>
          <dd>
            <ol className={styles.instrumentEvidenceList}>
              {view.annual.lossChain.map((stage) => (
                <li key={stage.id}>
                  <strong>{stage.label}</strong>:{" "}
                  {number(stage.inputKWh, 1)} →{" "}
                  {number(stage.outputKWh, 1)} kWh · loss{" "}
                  {number(stage.lossKWh, 1)} kWh (
                  {number(stage.lossPct, 2)}%) · {stage.explanation}
                </li>
              ))}
            </ol>
          </dd>
        </div>
      </dl>
      <p className={styles.provenanceLine}>
        {view.provenance.provider} · dataset{" "}
        {view.provenance.datasetVersion} · calculation{" "}
        {view.provenance.calculationVersion} · evidence{" "}
        {view.provenance.evidenceRefIds.length > 0
          ? view.provenance.evidenceRefIds.join(", ")
          : "none supplied"}
      </p>
      <section
        id={limitationId}
        className={styles.readoutLimitation}
        aria-label="Solar Array Engineering unavailable layers"
      >
        <p>
          <strong>Unavailable and not synthesized:</strong>
        </p>
        <ul>
          {UNAVAILABLE_LAYER_LABELS.map(([key, label]) => (
            <li key={key}>
              {label}: {view.unavailableLayers[key].reason}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
