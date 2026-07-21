"use client";

import { AnnualChronology, MicroTrace, ProductionDNA } from "./instruments";
import type {
  HourDatum,
  Lifecycle,
  NormalizedSnapshot,
  ScenarioConfig,
  ScenarioResult,
} from "./model";
import {
  clamp,
  formatCompact,
  formatNumber,
  formatTimestamp,
  numberOf,
  orientationScreeningScore,
  recordOf,
  stringOf,
} from "./model";

export interface WorkspaceDefinition {
  id: string;
  glyph: string;
  name: string;
  shortName: string;
  status: Lifecycle;
  description: string;
}

export const WORKSPACES: WorkspaceDefinition[] = [
  { id: "DT", glyph: "DT", name: "Solar Digital Twin Operations", shortName: "Digital twin", status: "IMPLEMENTED", description: "Site geometry, sun, weather, telemetry and energy flow in one operational scene." },
  { id: "AF", glyph: "AF", name: "Annual Energy Forecast Observatory", shortName: "Annual forecast", status: "IMPLEMENTED", description: "Full-year hourly energy, representative-year evidence and calibrated uncertainty." },
  { id: "WA", glyph: "WA", name: "Weather & Atmosphere Command Centre", shortName: "Atmosphere", status: "IMPLEMENTED", description: "Cloud, radiation, temperature and quality regimes translated into energy effects." },
  { id: "ML", glyph: "ML", name: "Forecast Model Laboratory", shortName: "Model lab", status: "EXPERIMENTAL", description: "Champion/challenger evidence, validation metrics and honest research candidates." },
  { id: "RV", glyph: "RV", name: "Forecast Replay & Validation Centre", shortName: "Replay validation", status: "SIMULATED", description: "Sample mode replays time-linked scenario-to-base deltas; observed-production validation activates only when a measured dataset is attached." },
  { id: "AE", glyph: "AE", name: "Solar Array Engineering Studio", shortName: "Array engineering", status: "SIMULATED", description: "Orientation, capacity, loss chain and sizing response surfaces." },
  { id: "SR", glyph: "SR", name: "Scenario & Resilience Simulator", shortName: "Resilience", status: "EXPERIMENTAL", description: "Named weather and system stressors with traceable energy consequences." },
  { id: "BE", glyph: "BE", name: "Battery & Energy-Flow Optimisation", shortName: "Battery flow", status: "SIMULATED", description: "Hourly dispatch, self-consumption, import/export and storage constraints." },
  { id: "RM", glyph: "RM", name: "Regional Solar Intelligence Map", shortName: "Regional map", status: "PLANNED", description: "Location-aware resource comparison with the current site as a verified anchor." },
  { id: "CL", glyph: "CL", name: "Climate & Long-Horizon Analysis", shortName: "Climate", status: "EXPERIMENTAL", description: "Interannual variability, regimes and long-horizon research boundaries." },
  { id: "FI", glyph: "FI", name: "Financial & Investment Observatory", shortName: "Financial", status: "SIMULATED", description: "Tariff-sensitive value, uncertainty range and project exposure." },
  { id: "PA", glyph: "PA", name: "Data Provenance & Scientific Audit", shortName: "Provenance", status: "IMPLEMENTED", description: "Provider-to-calculation lineage, assumptions, versions and reproducibility keys." },
  { id: "RP", glyph: "RP", name: "Research Publication Studio", shortName: "Publication", status: "IMPLEMENTED", description: "Export-ready evidence, datasets and transparent method notes." },
  { id: "MC", glyph: "MC", name: "Executive Mission Control", shortName: "Mission control", status: "IMPLEMENTED", description: "Production, risk, energy value, carbon and critical system signals." },
];

interface WorkspaceProps {
  workspaceId: string;
  base: NormalizedSnapshot;
  result: ScenarioResult;
  scenario: ScenarioConfig;
  setScenario: (next: ScenarioConfig) => void;
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function LifeTag({ status }: { status: Lifecycle | string }) {
  return <span className={`life-tag life-${status.toLowerCase()}`}>{status}</span>;
}

function InstrumentHeader({
  code,
  title,
  meta,
  status,
  actions,
}: {
  code: string;
  title: string;
  meta?: string;
  status?: Lifecycle;
  actions?: React.ReactNode;
}) {
  return (
    <header className="instrument-header">
      <span className="instrument-code">{code}</span>
      <h2>{title}</h2>
      {meta && <span className="instrument-meta">{meta}</span>}
      {status && <LifeTag status={status} />}
      {actions && <div className="instrument-actions">{actions}</div>}
    </header>
  );
}

function Metric({ label, value, detail, tone = "default" }: { label: string; value: string; detail?: string; tone?: string }) {
  return (
    <div className={`metric-readout tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function EmptyField({ title, detail, status = "PLANNED" }: { title: string; detail: string; status?: Lifecycle }) {
  return (
    <div className="empty-field" role="status">
      <span className="empty-field-mark" aria-hidden="true">∅</span>
      <div>
        <LifeTag status={status} />
        <h3>{title}</h3>
        <p>{detail}</p>
      </div>
    </div>
  );
}

function formatCurrency(value: number, config: ScenarioConfig, digits = 0): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: config.currency,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return `${formatNumber(value, digits)} ${config.currency}`;
  }
}

function annualUncertainty(result: ScenarioResult): number {
  const centre = result.summary.p50Kwh || result.summary.annualKwh;
  return centre > 0 ? ((result.summary.p90Kwh - result.summary.p10Kwh) / (2 * centre)) * 100 : 0;
}

function AnnualWorkspace({ base, result, selectedIndex, onSelect }: WorkspaceProps) {
  const comparisonsRaw = recordOf(base.representativeYear).comparisons;
  const comparisons = Array.isArray(comparisonsRaw) ? comparisonsRaw.map(recordOf) : [];
  const sourceWeights = recordOf(recordOf(base.representativeYear).sourceYearWeights);
  const interval = annualUncertainty(result);

  return (
    <div className="annual-workspace workspace-grid" data-testid="workspace-AF">
      <section className="forecast-constitution grid-span-full" aria-label="Forecast constitution">
        <div className="constitution-title">
          <span className="pulse-dot" aria-hidden="true" />
          FORECAST CONSTITUTION
        </div>
        <dl>
          <div><dt>HORIZON</dt><dd>8,760 h</dd></div>
          <div><dt>METHOD</dt><dd>{stringOf(recordOf(base.representativeYear), ["method"], "Representative-year synthesis")}</dd></div>
          <div><dt>INTERVAL</dt><dd>P10—P90 · ±{formatNumber(interval, 1)}%</dd></div>
          <div><dt>VALIDITY</dt><dd>estimate, not guarantee</dd></div>
        </dl>
      </section>

      <section className="instrument chronology-panel grid-span-8">
        <InstrumentHeader
          code="AF.01"
          title="Annual chronology field"
          meta="AC POWER · HOURLY · P10—P90 BAND"
          status={result.changed ? "SIMULATED" : "IMPLEMENTED"}
        />
        <AnnualChronology hours={result.hours} baseHours={base.hours} selectedIndex={selectedIndex} onSelect={onSelect} />
        <div className="chart-legend" aria-label="Chart legend">
          <span><i className="legend-line solar" />scenario P50</span>
          <span><i className="legend-area forecast" />confidence envelope</span>
          {result.changed && <span><i className="legend-line historical" />base configuration</span>}
        </div>
      </section>

      <section className="instrument confidence-panel grid-span-4">
        <InstrumentHeader code="AF.02" title="Forecast confidence galaxy" meta="UNCERTAINTY FIELD" status="EXPERIMENTAL" />
        <div className="confidence-galaxy" style={{ "--spread": `${clamp(interval, 5, 34)}%` } as React.CSSProperties}>
          <div className="galaxy-orbit orbit-a" />
          <div className="galaxy-orbit orbit-b" />
          <div className="galaxy-core"><span>P50</span><strong>{formatCompact(result.summary.p50Kwh || result.summary.annualKwh, " kWh")}</strong></div>
          <span className="galaxy-node node-p10">P10<br />{formatCompact(result.summary.p10Kwh, "")}</span>
          <span className="galaxy-node node-p90">P90<br />{formatCompact(result.summary.p90Kwh, "")}</span>
          <span className="galaxy-node node-q">Q<br />{formatNumber(result.summary.qualityScore)}%</span>
        </div>
        <p className="instrument-note">Halo radius encodes the annual P10–P90 span; opacity reflects snapshot quality.</p>
      </section>

      <section className="instrument dna-panel grid-span-9">
        <InstrumentHeader code="AF.03" title="Solar Production DNA" meta="365 DAYS × 24 HOURS · QUALITY-ALPHA" status="IMPLEMENTED" />
        <ProductionDNA hours={result.hours} selectedIndex={selectedIndex} onSelect={onSelect} />
        <div className="dna-scale"><span>0 kW</span><i /><span>{formatNumber(Math.max(0, ...result.hours.map((hour) => hour.acKw)), 1)} kW</span></div>
      </section>

      <section className="instrument year-panel grid-span-3">
        <InstrumentHeader code="AF.04" title="Representative year" meta="SOURCE EVIDENCE" status="IMPLEMENTED" />
        <div className="year-comparison">
          {comparisons.length ? comparisons.map((comparison) => {
            const year = stringOf(comparison, ["year"], "—");
            const delta = numberOf(comparison, ["deltaFromRepresentativePct"], 0);
            return (
              <div className="year-row" key={year}>
                <span>{year}</span>
                <div className="year-bar"><i style={{ width: `${clamp(50 + delta * 2.4, 7, 96)}%` }} /></div>
                <strong>{delta > 0 ? "+" : ""}{formatNumber(delta, 1)}%</strong>
                <small>w {formatNumber(numberOf(sourceWeights, [year], 0) * 100, 0)}%</small>
              </div>
            );
          }) : <EmptyField title="Source-year evidence unavailable" detail="The representative-year record has no 2022–2025 comparisons." status="PLANNED" />}
        </div>
        <p className="instrument-note">Weights are constructed by month and weather regime; totals are not simply averaged.</p>
      </section>
    </div>
  );
}

function DigitalTwinWorkspace({ base, result, scenario, selectedIndex }: WorkspaceProps) {
  const hour = result.hours[selectedIndex] ?? result.hours[0];
  const location = recordOf(recordOf(base.raw.config as unknown).location);
  const elevation = hour?.sunElevationDeg ?? (hour?.ghi ? 35 : -10);
  const azimuth = hour?.sunAzimuthDeg ?? 180;
  return (
    <div className="twin-workspace workspace-grid" data-testid="workspace-DT">
      <section className="instrument twin-scene grid-span-9">
        <InstrumentHeader code="DT.01" title="Operational solar twin" meta={`${stringOf(location, ["name"], "ACTIVE SITE")} · GEOREFERENCED SCENE`} status="IMPLEMENTED" />
        <div className={`twin-viewport ${hour?.ghi > 5 ? "is-day" : "is-night"}`}>
          <div className="twin-atmosphere" style={{ opacity: 0.25 + (hour?.cloud ?? 0) * 0.6 }} />
          <div className="twin-sun" style={{ left: `${clamp((azimuth / 360) * 100, 5, 95)}%`, top: `${clamp(70 - elevation * 0.72, 8, 82)}%` }}><span /></div>
          <div className="twin-horizon horizon-3" /><div className="twin-horizon horizon-2" /><div className="twin-horizon horizon-1" />
          <div className="array-plane">
            {Array.from({ length: 24 }, (_, index) => <i key={index} style={{ "--panel-index": index } as React.CSSProperties} />)}
          </div>
          <div className="irradiance-beam beam-a" /><div className="irradiance-beam beam-b" />
          <div className="twin-coordinate coord-n">N / 000°</div>
          <div className="twin-coordinate coord-e">E / 090°</div>
          <div className="twin-reticle"><i /><i /></div>
          <div className="telemetry-float float-power"><span>ARRAY AC</span><strong>{formatNumber(hour?.acKw ?? 0, 2)} kW</strong></div>
          <div className="telemetry-float float-poa"><span>POA FIELD</span><strong>{formatNumber(hour?.poa ?? 0)} W/m²</strong></div>
          <div className="telemetry-float float-cloud"><span>CLOUD</span><strong>{formatNumber((hour?.cloud ?? 0) * 100)}%</strong></div>
        </div>
      </section>
      <section className="instrument twin-signal grid-span-3">
        <InstrumentHeader code="DT.02" title="System signal rail" meta="LINKED HOUR" />
        <div className="signal-rail">
          <Metric label="SUN ELEVATION" value={`${formatNumber(elevation, 1)}°`} tone="solar" />
          <Metric label="CELL / AMBIENT" value={`${formatNumber(hour?.tempC ?? 0, 1)}°C`} detail="ambient weather input" />
          <Metric label="BATTERY" value={`${formatNumber(hour?.socKwh ?? 0, 2)} kWh`} tone="positive" />
          <Metric label="GRID VECTOR" value={hour && hour.gridExportKw > 0 ? `EXPORT ${formatNumber(hour.gridExportKw, 2)}` : `IMPORT ${formatNumber(hour?.gridImportKw ?? 0, 2)}`} detail="kW average in interval" />
          <Metric label="QUALITY" value={`${formatNumber((hour?.quality ?? 0) * 100)}%`} tone="forecast" />
        </div>
      </section>
      <section className="instrument grid-span-full twin-flow-strip">
        <InstrumentHeader code="DT.03" title="Live energy vector" meta="SOLAR → LOAD → STORAGE → GRID" status={result.changed ? "SIMULATED" : "IMPLEMENTED"} />
        <EnergyFlowDiagram hour={hour} batteryCapacity={scenario.batteryKwh} />
      </section>
    </div>
  );
}

function EnergyFlowDiagram({ hour, batteryCapacity }: { hour?: HourDatum; batteryCapacity: number }) {
  const nodes = [
    { label: "SOLAR", value: hour?.acKw ?? 0, unit: "kW", tone: "solar" },
    { label: "SITE LOAD", value: hour?.loadKw ?? 0, unit: "kW", tone: "forecast" },
    { label: "BATTERY", value: hour?.socKwh ?? 0, unit: batteryCapacity ? `/${formatNumber(batteryCapacity, 1)} kWh` : "kWh", tone: "positive" },
    { label: "GRID", value: Math.max(hour?.gridImportKw ?? 0, hour?.gridExportKw ?? 0), unit: hour && hour.gridExportKw > 0 ? "kW OUT" : "kW IN", tone: "model" },
  ];
  return (
    <div className="energy-flow-diagram" aria-label="Linked-hour energy flow">
      {nodes.map((node, index) => (
        <div className="energy-flow-segment" key={node.label}>
          <div className={`flow-node tone-${node.tone}`}><span>{node.label}</span><strong>{formatNumber(node.value, 2)}</strong><small>{node.unit}</small></div>
          {index < nodes.length - 1 && <div className="flow-conduit"><i style={{ "--flow": `${clamp(node.value * 10, 12, 100)}%` } as React.CSSProperties} /></div>}
        </div>
      ))}
    </div>
  );
}

function WeatherWorkspace({ result, selectedIndex, onSelect }: WorkspaceProps) {
  const dayStart = Math.floor(selectedIndex / 24) * 24;
  const day = result.hours.slice(dayStart, dayStart + 24);
  const hour = result.hours[selectedIndex] ?? result.hours[0];
  return (
    <div className="weather-workspace workspace-grid" data-testid="workspace-WA">
      <section className="instrument atmosphere-field grid-span-8">
        <InstrumentHeader code="WA.01" title="Irradiance field map" meta="ATMOSPHERE → PLANE OF ARRAY" status="IMPLEMENTED" />
        <div className="atmosphere-viewport">
          <div className="atmosphere-contours">
            {day.map((point) => (
              <button
                key={point.index}
                className={point.index === selectedIndex ? "active" : ""}
                style={{
                  "--cloud": point.cloud,
                  "--irradiance": clamp(point.poa / Math.max(1, ...day.map((item) => item.poa)), 0, 1),
                } as React.CSSProperties}
                aria-label={`${String(point.hour).padStart(2, "0")}:00, ${formatNumber(point.cloud * 100)} percent cloud, ${formatNumber(point.poa)} watts per square metre`}
                onClick={() => onSelect(point.index)}
              >
                <i />
                <span>{String(point.hour).padStart(2, "0")}</span>
              </button>
            ))}
          </div>
          <div className="weather-front front-a" /><div className="weather-front front-b" />
          <div className="field-reticle"><span>POA {formatNumber(hour?.poa ?? 0)} W/m²</span></div>
        </div>
      </section>
      <section className="instrument atmosphere-profile grid-span-4">
        <InstrumentHeader code="WA.02" title="Atmospheric profile" meta="LINKED HOUR" />
        <div className="profile-columns">
          <Metric label="CLOUD COVER" value={`${formatNumber((hour?.cloud ?? 0) * 100)}%`} tone="forecast" />
          <Metric label="GLOBAL HORIZONTAL" value={`${formatNumber(hour?.ghi ?? 0)} W/m²`} tone="solar" />
          <Metric label="PLANE OF ARRAY" value={`${formatNumber(hour?.poa ?? 0)} W/m²`} tone="positive" />
          <Metric label="TEMPERATURE" value={`${formatNumber(hour?.tempC ?? 0, 1)} °C`} />
          <Metric label="TRANSPOSITION" value={hour?.ghi ? `${formatNumber((hour.poa / hour.ghi) * 100)}%` : "night"} detail="POA / GHI ratio" />
          <Metric label="RECORD QUALITY" value={`${formatNumber((hour?.quality ?? 0) * 100)}%`} tone={(hour?.quality ?? 0) < .7 ? "critical" : "forecast"} />
        </div>
      </section>
      <section className="instrument forecast-ribbon grid-span-full">
        <InstrumentHeader code="WA.03" title="Atmospheric forecast ribbon" meta="24 HOUR LINKED CONTEXT · CLOUD / POA / TEMPERATURE" />
        <div className="ribbon-lanes">
          <div><span>CLOUD</span><div className="ribbon-cells">{day.map((point) => <i key={point.index} style={{ opacity: .12 + point.cloud * .86 }} />)}</div></div>
          <div><span>POA</span><MicroTrace values={day.map((point) => point.poa)} label="Twenty-four hour plane-of-array irradiance" tone="solar" /></div>
          <div><span>TEMP</span><MicroTrace values={day.map((point) => point.tempC)} label="Twenty-four hour temperature" tone="forecast" /></div>
        </div>
      </section>
    </div>
  );
}

function ModelWorkspace({ base }: WorkspaceProps) {
  const models = base.models;
  const implemented = models.filter((model) => model.status !== "PLANNED");
  return (
    <div className="model-workspace workspace-grid" data-testid="workspace-ML">
      <section className="instrument model-ledger grid-span-8">
        <InstrumentHeader code="ML.01" title="Champion / challenger ledger" meta="ROLLING-ORIGIN EVIDENCE ONLY" status="EXPERIMENTAL" />
        {models.length ? (
          <div className="data-table-wrap">
            <table className="science-table">
              <thead><tr><th>MODEL</th><th>STATE</th><th>MAE</th><th>RMSE</th><th>PI COVERAGE</th></tr></thead>
              <tbody>{models.map((model) => (
                <tr key={model.name}>
                  <th>{model.name}<small>{model.note}</small></th>
                  <td><LifeTag status={model.status} /></td>
                  <td>{Number.isFinite(model.mae) ? formatNumber(model.mae as number, 3) : "not run"}</td>
                  <td>{Number.isFinite(model.rmse) ? formatNumber(model.rmse as number, 3) : "not run"}</td>
                  <td>{Number.isFinite(model.coverage) ? `${formatNumber(model.coverage as number, 1)}%` : "not calibrated"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyField title="No stored model runs" detail="Metrics appear only after a reproducible evaluation artifact is attached." status="PLANNED" />}
      </section>
      <section className="instrument calibration-field grid-span-4">
        <InstrumentHeader code="ML.02" title="Calibration field" meta="PREDICTED ↔ OBSERVED" />
        <div className="calibration-plot" aria-label="Calibration plot">
          <i className="calibration-diagonal" />
          {implemented.slice(0, 7).map((model, index) => {
            const coverage = Number.isFinite(model.coverage) ? model.coverage as number : 50;
            return <span key={model.name} title={model.name} style={{ left: `${clamp(12 + coverage * .76, 8, 91)}%`, bottom: `${clamp(12 + coverage * .68 + (index % 3) * 4, 9, 91)}%` }} />;
          })}
          <b className="axis-y">OBSERVED COVERAGE</b><b className="axis-x">NOMINAL COVERAGE</b>
        </div>
        <p className="instrument-note">Only models with stored validation metrics are plotted. Empty metrics are not imputed.</p>
      </section>
      <section className="instrument model-pipeline grid-span-full">
        <InstrumentHeader code="ML.03" title="Research model pipeline" meta="BACKTEST → CALIBRATE → CHALLENGE → PROMOTE" />
        <div className="pipeline-track">
          {["Seasonal holdout", "Rolling origin", "Error decomposition", "Interval calibration", "Drift gate", "Champion review"].map((step, index) => <div key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong><small>{index < 4 ? "implemented protocol" : "human gate"}</small></div>)}
        </div>
      </section>
    </div>
  );
}

function ReplayWorkspace({ base, result, selectedIndex, onSelect }: WorkspaceProps) {
  const hour = result.hours[selectedIndex] ?? result.hours[0];
  const scenarioOutput = hour?.acKw ?? 0;
  const intervalWidth = (hour?.p90Kw ?? 0) - (hour?.p10Kw ?? 0);
  const baseOutput = base.hours[selectedIndex]?.acKw ?? 0;
  const delta = scenarioOutput - baseOutput;
  const window = result.hours.slice(Math.max(0, selectedIndex - 72), selectedIndex + 73);
  return (
    <div className="replay-workspace workspace-grid" data-testid="workspace-RV">
      <section className="instrument replay-main grid-span-9">
        <InstrumentHeader code="RV.01" title="Scenario delta replay" meta="MODELLED SCENARIO OUTPUT VS BASE CONFIGURATION" status="SIMULATED" />
        <AnnualChronology hours={result.hours} baseHours={base.hours} selectedIndex={selectedIndex} onSelect={onSelect} />
      </section>
      <section className="instrument replay-inspect grid-span-3">
        <InstrumentHeader code="RV.02" title="Delta lens" meta="LINKED HOUR · NOT OBSERVED VALIDATION" />
        <div className="error-lens">
          <span>{formatTimestamp(hour?.timestamp ?? "")}</span>
          <strong className={delta < 0 ? "negative" : "positive"}>{delta > 0 ? "+" : ""}{formatNumber(delta, 3)} kW</strong>
          <small>scenario minus base</small>
          <div className="error-gauge"><i style={{ left: `${clamp(50 + delta * 12, 3, 97)}%` }} /></div>
          <dl><div><dt>BASE</dt><dd>{formatNumber(baseOutput, 3)} kW</dd></div><div><dt>SCENARIO</dt><dd>{formatNumber(scenarioOutput, 3)} kW</dd></div><div><dt>MODEL INTERVAL WIDTH</dt><dd>{formatNumber(intervalWidth, 3)} kW</dd></div></dl>
        </div>
      </section>
      <section className="instrument replay-window grid-span-full">
        <InstrumentHeader code="RV.03" title="Seven-day delta window" meta="±72 HOURS AROUND LINKED CURSOR" />
        <MicroTrace values={window.map((point, index) => point.acKw - (base.hours[Math.max(0, selectedIndex - 72) + index]?.acKw ?? 0))} label="Seven-day scenario-to-base delta trace" tone="critical" />
        <p className="instrument-note">This view replays a deterministic configuration delta. It is not a forecast-versus-observation residual or a validation result.</p>
      </section>
    </div>
  );
}

function OptimisationTerrain({ scenario, setScenario, base }: Pick<WorkspaceProps, "scenario" | "setScenario" | "base">) {
  const tilts = [10, 20, 30, 35, 40, 50];
  const azimuths = [120, 150, 180, 210, 240];
  const baseScore = orientationScreeningScore(base.config.tiltDeg, base.config.azimuthDeg);
  const relativeScore = (tilt: number, azimuth: number) =>
    orientationScreeningScore(tilt, azimuth) / Math.max(0.01, baseScore);
  return (
    <div className="optimisation-terrain" role="grid" aria-label="Simulated panel tilt and azimuth response terrain">
      <div className="terrain-corner">TILT<br />AZ</div>
      {azimuths.map((azimuth) => <span className="terrain-axis" key={azimuth}>{azimuth}°</span>)}
      {tilts.map((tilt) => (
        <div className="terrain-row" key={tilt}>
          <span className="terrain-axis">{tilt}°</span>
          {azimuths.map((azimuth) => {
            const value = relativeScore(tilt, azimuth);
            const intensity = clamp(value * .8, .4, 1);
            const active = Math.abs(scenario.tiltDeg - tilt) < 3 && Math.abs(scenario.azimuthDeg - azimuth) < 10;
            return <button key={azimuth} className={active ? "active" : ""} role="gridcell" aria-label={`Set tilt ${tilt} degrees and azimuth ${azimuth} degrees; modelled orientation proxy ${formatNumber(value * 100)} percent of the recorded base`} onClick={() => setScenario({ ...scenario, tiltDeg: tilt, azimuthDeg: azimuth })} style={{ "--terrain": intensity } as React.CSSProperties}><i /><small>{formatNumber(value * 100)}</small></button>;
          })}
        </div>
      ))}
      <p>Values are a bounded orientation proxy normalised to the recorded base (100%), not a bankable optimiser result. Baseline: {formatNumber(base.config.tiltDeg)}° / {formatNumber(base.config.azimuthDeg)}°.</p>
    </div>
  );
}

function EngineeringWorkspace(props: WorkspaceProps) {
  const { base, result, scenario, setScenario } = props;
  return (
    <div className="engineering-workspace workspace-grid" data-testid="workspace-AE">
      <section className="instrument terrain-panel grid-span-8">
        <InstrumentHeader code="AE.01" title="Panel-tilt optimisation terrain" meta="CLICK A CELL TO BRANCH SCENARIO" status="SIMULATED" />
        <OptimisationTerrain scenario={scenario} setScenario={setScenario} base={base} />
      </section>
      <section className="instrument array-blueprint grid-span-4">
        <InstrumentHeader code="AE.02" title="Array configuration" meta="CURRENT BRANCH" />
        <div className="blueprint-array" style={{ transform: `perspective(420px) rotateX(${clamp(64 - scenario.tiltDeg, 12, 72)}deg) rotateZ(${(scenario.azimuthDeg - 180) * .08}deg)` }}>
          {Array.from({ length: 20 }, (_, index) => <i key={index} />)}
        </div>
        <div className="blueprint-dimensions"><span>{formatNumber(scenario.capacityKw, 1)} kWp DC</span><span>{formatNumber(scenario.tiltDeg)}° TILT</span><span>{formatNumber(scenario.azimuthDeg)}° AZ</span></div>
      </section>
      <section className="instrument engineering-delta grid-span-full">
        <InstrumentHeader code="AE.03" title="Engineering consequence tape" meta="BASE → SCENARIO" />
        <div className="metric-tape">
          <Metric label="ANNUAL YIELD" value={`${formatCompact(result.summary.annualKwh, " kWh")}`} detail={`${result.productionFactor >= 1 ? "+" : ""}${formatNumber((result.productionFactor - 1) * 100, 1)}% vs base`} tone="solar" />
          <Metric label="SPECIFIC YIELD" value={`${formatNumber(result.summary.specificYield)} kWh/kWp`} />
          <Metric label="SYSTEM LOSSES" value={`${formatNumber(scenario.systemLossPct, 1)}%`} />
          <Metric label="PERFORMANCE RATIO" value={`${formatNumber(result.summary.performanceRatio, 1)}%`} tone="positive" />
          <Metric label="DC CAPACITY" value={`${formatNumber(scenario.capacityKw, 1)} kWp`} />
        </div>
      </section>
    </div>
  );
}

function ScenarioWorkspace({ base, result }: WorkspaceProps) {
  const stressRaw = recordOf(base.optimization).stressScenarios;
  const stresses = Array.isArray(stressRaw) ? stressRaw.map(recordOf) : [];
  const monteCarlo = recordOf(recordOf(base.optimization).monteCarlo);
  return (
    <div className="scenario-workspace workspace-grid" data-testid="workspace-SR">
      <section className="instrument scenario-tree-panel grid-span-8">
        <InstrumentHeader code="SR.01" title="Scenario tree" meta="BASELINE → WEATHER / SYSTEM / MARKET" status="EXPERIMENTAL" />
        {stresses.length ? <div className="scenario-tree">
          <div className="tree-origin"><span>BASE</span><strong>{formatCompact(result.summary.annualKwh, " kWh")}</strong></div>
          <div className="tree-trunk" />
          <div className="tree-branches">{stresses.map((stress, index) => {
            const delta = numberOf(stress, ["generationDeltaPct"], 0);
            return <div className="tree-branch" key={stringOf(stress, ["id", "label"], String(index))}><i /><div><LifeTag status={stringOf(stress, ["status"], "EXPERIMENTAL")} /><strong>{stringOf(stress, ["label"], `STRESS ${index + 1}`)}</strong><span className={delta < 0 ? "negative" : "positive"}>{delta > 0 ? "+" : ""}{formatNumber(delta, 1)}% generation</span><small>{stringOf(stress, ["explanation"], "No explanatory record.")}</small></div></div>;
          })}</div>
        </div> : <EmptyField title="No stress runs attached" detail="Named resilience results will appear only when the optimisation record supplies them." status="PLANNED" />}
      </section>
      <section className="instrument monte-carlo-panel grid-span-4">
        <InstrumentHeader code="SR.02" title="Monte Carlo envelope" meta="SEEDED · REPRODUCIBLE" status="EXPERIMENTAL" />
        {Object.keys(monteCarlo).length ? <>
          <div className="monte-carlo-range">
            <span>P05 {formatCompact(numberOf(monteCarlo, ["p05GenerationKWh"], 0), "")}</span>
            <div><i style={{ left: "5%" }} /><i className="p50" style={{ left: "50%" }} /><i style={{ left: "95%" }} /></div>
            <span>P95 {formatCompact(numberOf(monteCarlo, ["p95GenerationKWh"], 0), "")}</span>
          </div>
          <div className="profile-columns"><Metric label="TRIALS" value={formatNumber(numberOf(monteCarlo, ["trials"], 0))} /><Metric label="SEED" value={formatNumber(numberOf(monteCarlo, ["seed"], 0))} /><Metric label="COEFFICIENT OF VARIATION" value={`${formatNumber(numberOf(monteCarlo, ["coefficientOfVariationPct"], 0), 2)}%`} tone="model" /></div>
        </> : <EmptyField title="Monte Carlo record unavailable" detail="No distributions are synthesized in the interface." status="PLANNED" />}
      </section>
      <section className="instrument resilience-note grid-span-full">
        <InstrumentHeader code="SR.03" title="Robustness boundary" meta="KNOWN LIMITS" />
        <div className="method-boundary"><p>Stress results are deterministic scenario deltas under documented assumptions. They are not extreme-event guarantees and do not replace structural or grid studies.</p><span>BAYESIAN OPTIMISATION · PLANNED</span><span>ROBUST OPTIMISATION · PLANNED</span><span>SCENARIO TREES · EXPERIMENTAL</span></div>
      </section>
    </div>
  );
}

function BatteryWorkspace({ result, scenario, selectedIndex, onSelect }: WorkspaceProps) {
  const start = Math.floor(selectedIndex / 24) * 24;
  const day = result.hours.slice(start, start + 24);
  const hour = result.hours[selectedIndex] ?? result.hours[0];
  const maxSoc = Math.max(1, scenario.batteryKwh);
  return (
    <div className="battery-workspace workspace-grid" data-testid="workspace-BE">
      <section className="instrument battery-flow-panel grid-span-8">
        <InstrumentHeader code="BE.01" title="Battery state-of-charge flow" meta="24 HOUR DISPATCH · 1 HOUR STEP" status="SIMULATED" />
        <div className="battery-flow-chart">
          <div className="soc-bands"><span>100%</span><span>50%</span><span>0%</span></div>
          <div className="soc-columns">{day.map((point) => <button key={point.index} className={point.index === selectedIndex ? "active" : ""} title={`${point.hour}:00 · ${formatNumber(point.socKwh, 2)} kWh`} aria-label={`Select ${String(point.hour).padStart(2, "0")}:00; battery state of charge ${formatNumber(point.socKwh, 2)} kilowatt-hours`} onClick={() => onSelect(point.index)} style={{ "--soc": clamp(point.socKwh / maxSoc, 0, 1), "--export": clamp(point.gridExportKw / Math.max(1, scenario.capacityKw), 0, 1), "--import": clamp(point.gridImportKw / Math.max(1, point.loadKw), 0, 1) } as React.CSSProperties}><i /><b /><em /></button>)}</div>
          <div className="soc-axis">{[0, 3, 6, 9, 12, 15, 18, 21].map((value) => <span key={value}>{String(value).padStart(2, "0")}</span>)}</div>
        </div>
        <div className="chart-legend"><span><i className="legend-area positive" />state of charge</span><span><i className="legend-line solar" />grid export</span><span><i className="legend-line critical" />grid import</span></div>
      </section>
      <section className="instrument battery-vitals grid-span-4">
        <InstrumentHeader code="BE.02" title="Dispatch vitals" meta="LINKED HOUR" />
        <div className="battery-cell-visual"><div style={{ height: `${clamp(((hour?.socKwh ?? 0) / maxSoc) * 100, 0, 100)}%` }} /><span>{scenario.batteryKwh > 0 ? formatNumber(((hour?.socKwh ?? 0) / maxSoc) * 100) : "0"}%</span></div>
        <div className="profile-columns"><Metric label="CAPACITY" value={`${formatNumber(scenario.batteryKwh, 1)} kWh`} /><Metric label="SOC" value={`${formatNumber(hour?.socKwh ?? 0, 2)} kWh`} tone="positive" /><Metric label="GRID IMPORT" value={`${formatNumber(hour?.gridImportKw ?? 0, 2)} kW`} tone="critical" /><Metric label="GRID EXPORT" value={`${formatNumber(hour?.gridExportKw ?? 0, 2)} kW`} tone="solar" /></div>
      </section>
      <section className="instrument grid-span-full">
        <InstrumentHeader code="BE.03" title="Annual balance" meta="ENERGY CONSERVATION LEDGER" />
        <div className="metric-tape"><Metric label="SELF-CONSUMPTION" value={`${formatNumber(result.summary.selfConsumptionPct, 1)}%`} tone="positive" /><Metric label="IMPORT" value={formatCompact(result.summary.gridImportKwh, " kWh")} /><Metric label="EXPORT" value={formatCompact(result.summary.gridExportKwh, " kWh")} tone="solar" /><Metric label="ENERGY VALUE" value={formatCurrency(result.summary.revenue, scenario)} tone="model" /></div>
      </section>
    </div>
  );
}

function RegionalWorkspace({ base }: WorkspaceProps) {
  const location = recordOf(recordOf(base.raw.config as unknown).location);
  const latitude = numberOf(location, ["latitude"], 0);
  const longitude = numberOf(location, ["longitude"], 0);
  return (
    <div className="regional-workspace workspace-grid" data-testid="workspace-RM">
      <section className="instrument regional-map-field grid-span-9">
        <InstrumentHeader code="RM.01" title="Regional solar potential field" meta="CURRENT SITE ANCHOR · COMPARATIVE LAYERS UNCONNECTED" status="PLANNED" />
        <div className="regional-globe">
          <div className="globe-grid latitude-grid" /><div className="globe-grid longitude-grid" />
          <div className="solar-terminator" />
          <div className="site-beacon" style={{ left: `${clamp(50 + longitude * .24, 12, 88)}%`, top: `${clamp(50 - latitude * .44, 12, 88)}%` }}><i /><span>{stringOf(location, ["name"], "CURRENT SITE")}</span></div>
          <div className="map-scale">EUROPEAN FIELD / 1° GRID RESERVED</div>
        </div>
      </section>
      <section className="instrument regional-site grid-span-3">
        <InstrumentHeader code="RM.02" title="Verified site" meta="CONFIGURATION" />
        <div className="profile-columns"><Metric label="LATITUDE" value={`${formatNumber(latitude, 4)}°`} /><Metric label="LONGITUDE" value={`${formatNumber(longitude, 4)}°`} /><Metric label="ELEVATION" value={`${formatNumber(numberOf(location, ["elevationM"], 0))} m`} /><Metric label="TIMEZONE" value={stringOf(location, ["timezone"], "—")} /></div>
        <EmptyField title="Regional comparison not connected" detail="No neighbouring-site values are invented. Connect PVGIS or reanalysis tiles to activate cross-location ranking." status="PLANNED" />
      </section>
      <section className="instrument grid-span-full">
        <InstrumentHeader code="RM.03" title="Layer registry" meta="PROVIDER READINESS" />
        <div className="layer-registry"><span><i className="on" />CURRENT SITE · IMPLEMENTED</span><span><i />PVGIS RESOURCE · PLANNED LIVE TILE</span><span><i />ERA5 CLIMATE · PLANNED LIVE TILE</span><span><i />TERRAIN / HORIZON · PLANNED</span></div>
      </section>
    </div>
  );
}

function ClimateWorkspace({ base, result }: WorkspaceProps) {
  const monthlyRaw = base.raw.monthly as unknown[];
  const years = ["2022", "2023", "2024", "2025"];
  const yearTotals: number[] = years.map((year) => monthlyRaw.reduce<number>(
    (sum, entry) => sum + numberOf(recordOf(recordOf(entry).historicalGenerationKWh), [year], 0),
    0,
  ));
  const representative = result.summary.annualKwh;
  return (
    <div className="climate-workspace workspace-grid" data-testid="workspace-CL">
      <section className="instrument climate-stripes grid-span-8">
        <InstrumentHeader code="CL.01" title="Interannual production climate" meta="2022—2025 VS REPRESENTATIVE" status="EXPERIMENTAL" />
        <div className="climate-year-lines">
          {years.map((year, yearIndex) => {
            const monthly = monthlyRaw.map((entry) => numberOf(recordOf(recordOf(entry).historicalGenerationKWh), [year], 0));
            const max = Math.max(1, ...monthly);
            return <div className="climate-year" key={year}><span>{year}</span><div>{monthly.map((value, index) => <i key={index} title={`${year} ${index + 1}: ${formatNumber(value)} kWh`} style={{ height: `${clamp((value / max) * 100, 2, 100)}%` }} />)}</div><strong>{formatCompact(yearTotals[yearIndex], " kWh")}</strong></div>;
          })}
          <div className="climate-year representative"><span>TYP</span><div>{result.months.map((month) => <i key={month.month} style={{ height: `${clamp((month.energyKwh / Math.max(1, ...result.months.map((item) => item.energyKwh))) * 100, 2, 100)}%` }} />)}</div><strong>{formatCompact(representative, " kWh")}</strong></div>
        </div>
      </section>
      <section className="instrument climate-risk grid-span-4">
        <InstrumentHeader code="CL.02" title="Climate risk boundary" meta="INTERANNUAL SAMPLE" />
        <div className="risk-compass"><i /><span>WEATHER<br />VARIABILITY</span><b>{yearTotals.some(Boolean) ? `${formatNumber(((Math.max(...yearTotals) - Math.min(...yearTotals)) / Math.max(1, representative)) * 100, 1)}%` : "—"}</b></div>
        <p className="instrument-note">Range uses only the supplied 2022–2025 historical production fields. It is not a future climate projection.</p>
      </section>
      <section className="instrument grid-span-full">
        <InstrumentHeader code="CL.03" title="Long-horizon research queue" meta="NO FABRICATED PROJECTIONS" />
        <div className="method-boundary"><span>WEATHER NORMALISATION · EXPERIMENTAL</span><span>CMIP DOWNSCALING · PLANNED</span><span>DEGRADATION COHORTS · PLANNED</span><span>REGIME SHIFT DETECTION · PLANNED</span></div>
      </section>
    </div>
  );
}

function FinancialWorkspace({ result, scenario }: WorkspaceProps) {
  const p10Ratio = result.summary.annualKwh ? result.summary.p10Kwh / result.summary.annualKwh : 0;
  const p90Ratio = result.summary.annualKwh ? result.summary.p90Kwh / result.summary.annualKwh : 0;
  const p50Value = result.summary.revenue;
  return (
    <div className="financial-workspace workspace-grid" data-testid="workspace-FI">
      <section className="instrument financial-waterfall grid-span-8">
        <InstrumentHeader code="FI.01" title="Annual energy value observatory" meta="AVOIDED IMPORT + EXPORT REVENUE" status="SIMULATED" />
        <div className="value-tower">
          {[{ label: "P10", value: p50Value * p10Ratio, tone: "historical" }, { label: "P50", value: p50Value, tone: "solar" }, { label: "P90", value: p50Value * p90Ratio, tone: "positive" }].map((item) => <div key={item.label}><span>{item.label}</span><i className={`tone-${item.tone}`} style={{ height: `${clamp((item.value / Math.max(1, p50Value * p90Ratio)) * 100, 4, 100)}%` }} /><strong>{formatCurrency(item.value, scenario)}</strong></div>)}
          <div className="value-baseline" />
        </div>
        <p className="instrument-note">Uncertainty translates the generation interval at constant tariff; financing, tax, O&M and capital cost are outside this screening view.</p>
      </section>
      <section className="instrument tariff-console grid-span-4">
        <InstrumentHeader code="FI.02" title="Tariff exposure" meta="CURRENT SCENARIO" />
        <div className="profile-columns"><Metric label="IMPORT PRICE" value={`${formatNumber(scenario.importPrice, 3)} ${scenario.currency}/kWh`} /><Metric label="EXPORT PRICE" value={`${formatNumber(scenario.exportPrice, 3)} ${scenario.currency}/kWh`} /><Metric label="GRID IMPORT" value={formatCompact(result.summary.gridImportKwh, " kWh")} /><Metric label="GRID EXPORT" value={formatCompact(result.summary.gridExportKwh, " kWh")} /><Metric label="NET ENERGY VALUE" value={formatCurrency(result.summary.revenue, scenario)} tone="positive" /></div>
      </section>
      <section className="instrument grid-span-full">
        <InstrumentHeader code="FI.03" title="Investment model boundary" meta="TRANSPARENCY NOTICE" />
        <div className="method-boundary"><span>ENERGY VALUE · SIMULATED</span><span>PAYBACK · AWAITS CAPEX</span><span>IRR / NPV · PLANNED</span><span>UNCERTAINTY-ADJUSTED RETURN · PLANNED</span></div>
      </section>
    </div>
  );
}

function ProvenanceWorkspace({ base }: WorkspaceProps) {
  const rawList = base.raw.provenance as unknown[];
  return (
    <div className="provenance-workspace workspace-grid" data-testid="workspace-PA">
      <section className="instrument provenance-graph grid-span-8">
        <InstrumentHeader code="PA.01" title="Data provenance explorer" meta="LINEAGE GRAPH · PROVIDER → RESULT" status="IMPLEMENTED" />
        {rawList.length ? <div className="lineage-graph">{rawList.map((entry, index) => {
          const item = recordOf(entry);
          const quality = recordOf(item.quality);
          return <div className="lineage-stage" key={stringOf(item, ["id"], String(index))}><div className="lineage-node"><span>{stringOf(item, ["kind"], "RECORD").toUpperCase()}</span><strong>{stringOf(item, ["name"], "Unnamed lineage record")}</strong><small>{stringOf(item, ["version"], "unversioned")}</small><i style={{ width: `${clamp(numberOf(quality, ["score"], 0) * 100, 1, 100)}%` }} /></div>{index < rawList.length - 1 && <div className="lineage-edge"><b>TRANSFORM</b></div>}</div>;
        })}</div> : <EmptyField title="No provenance graph" detail="Results remain unverified until lineage records are supplied." status="PLANNED" />}
      </section>
      <section className="instrument audit-ledger grid-span-4">
        <InstrumentHeader code="PA.02" title="Scientific audit ledger" meta="RESULT ENVELOPE" />
        <dl className="audit-list">{base.provenance.map((row, index) => <div key={`${row.key}-${index}`}><dt>{row.key}</dt><dd>{row.value}</dd>{row.status && <small>{row.status}</small>}</div>)}</dl>
      </section>
      <section className="instrument reproducibility-panel grid-span-full">
        <InstrumentHeader code="PA.03" title="Reproducibility contract" meta="VERSIONED INPUTS + CALCULATION + ASSUMPTIONS" />
        <div className="repro-strip"><span><b>DATASET</b>{base.datasetVersion}</span><span><b>CALCULATION</b>{base.calculationVersion}</span><span><b>MODEL</b>{base.modelName}</span><span><b>ISSUED</b>{base.issueTime}</span></div>
      </section>
    </div>
  );
}

function PublicationWorkspace({ base, result, scenario }: WorkspaceProps) {
  const downloadCsv = () => {
    const columns = ["timestamp", "ac_kw", "p10_kw", "p90_kw", "ghi_wm2", "poa_wm2", "temp_c", "cloud_fraction", "load_kw", "soc_kwh", "grid_import_kw", "grid_export_kw", "quality"];
    const rows = result.hours.map((hour) => [hour.timestamp, hour.acKw, hour.p10Kw, hour.p90Kw, hour.ghi, hour.poa, hour.tempC, hour.cloud, hour.loadKw, hour.socKwh, hour.gridImportKw, hour.gridExportKw, hour.quality].join(","));
    const blob = new Blob([[columns.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `solar-intelligence-${base.datasetVersion}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="publication-workspace workspace-grid" data-testid="workspace-RP">
      <section className="instrument publication-preview grid-span-8">
        <InstrumentHeader code="RP.01" title="Publication figure plate" meta="ANNUAL GENERATION + UNCERTAINTY" status="IMPLEMENTED" />
        <div className="paper-preview">
          <header><span>FIGURE 01</span><strong>Representative-year photovoltaic generation envelope</strong></header>
          <div className="paper-chart"><MicroTrace values={result.months.map((month) => month.energyKwh)} compare={result.months.map((month) => month.p10Kwh)} label="Monthly representative-year generation figure" tone="solar" /></div>
          <p>Hourly physics-informed simulation aggregated to calendar month. Shaded interval: P10–P90 input/model uncertainty. Dataset {base.datasetVersion}; calculation {base.calculationVersion}.</p>
        </div>
      </section>
      <section className="instrument export-console grid-span-4">
        <InstrumentHeader code="RP.02" title="Research export" meta="REPRODUCIBLE ARTIFACTS" />
        <button className="primary-action export-button" onClick={downloadCsv}>EXPORT 8,760-HOUR CSV <kbd>E</kbd></button>
        <dl className="audit-list"><div><dt>ROWS</dt><dd>{formatNumber(result.hours.length)}</dd></div><div><dt>DATASET</dt><dd>{base.datasetVersion}</dd></div><div><dt>SCENARIO</dt><dd>{result.changed ? "local simulation branch" : "base snapshot"}</dd></div><div><dt>UNITS</dt><dd>{base.units}</dd></div></dl>
      </section>
      <section className="instrument grid-span-full">
        <InstrumentHeader code="RP.03" title="Methods capsule" meta="COPY-SAFE SCIENTIFIC LANGUAGE" />
        <p className="methods-capsule">Estimated annual generation: <strong>{formatNumber(result.summary.annualKwh)} kWh</strong> for a <strong>{formatNumber(scenario.capacityKw, 1)} kWp</strong> system. The interval spans <strong>{formatNumber(result.summary.p10Kwh)}–{formatNumber(result.summary.p90Kwh)} kWh</strong>. These are modelled outcomes under documented assumptions, not guaranteed production.</p>
      </section>
    </div>
  );
}

function MissionControlWorkspace({ result, scenario, selectedIndex }: WorkspaceProps) {
  const hour = result.hours[selectedIndex] ?? result.hours[0];
  const interval = annualUncertainty(result);
  const alerts = [
    ...(hour && hour.quality < .7 ? ["LOW DATA QUALITY AT LINKED HOUR"] : []),
    ...(hour && hour.tempC > 38 ? ["HEAT-STRESS INPUT ACTIVE"] : []),
    ...(interval > 20 ? ["WIDE ANNUAL UNCERTAINTY ENVELOPE"] : []),
  ];
  return (
    <div className="mission-workspace workspace-grid" data-testid="workspace-MC">
      <section className="mission-hero grid-span-full">
        <span>ANNUAL SOLAR MISSION STATE</span>
        <strong>{formatCompact(result.summary.annualKwh, " kWh")}</strong>
        <small>P50 estimated generation · {formatNumber(scenario.capacityKw, 1)} kWp configured</small>
        <div className="mission-arc" style={{ "--progress": `${clamp(result.summary.qualityScore, 0, 100)}%` } as React.CSSProperties}><i /></div>
      </section>
      <section className="instrument executive-signals grid-span-8">
        <InstrumentHeader code="MC.01" title="Mission outcome vector" meta="ENERGY / GRID / VALUE / CARBON" />
        <div className="executive-grid"><Metric label="SPECIFIC YIELD" value={`${formatNumber(result.summary.specificYield)} kWh/kWp`} tone="solar" /><Metric label="SELF-CONSUMPTION" value={`${formatNumber(result.summary.selfConsumptionPct, 1)}%`} tone="positive" /><Metric label="NET ENERGY VALUE" value={formatCurrency(result.summary.revenue, scenario)} tone="model" /><Metric label="CARBON AVOIDED" value={formatCompact(result.summary.carbonKg, " kg")} tone="positive" /><Metric label="GRID IMPORT" value={formatCompact(result.summary.gridImportKwh, " kWh")} /><Metric label="GRID EXPORT" value={formatCompact(result.summary.gridExportKwh, " kWh")} tone="forecast" /></div>
      </section>
      <section className="instrument alert-console grid-span-4">
        <InstrumentHeader code="MC.02" title="Critical alert state" meta="LINKED + ANNUAL" />
        {alerts.length ? <ul className="alert-list">{alerts.map((alert) => <li key={alert}><i />{alert}</li>)}</ul> : <div className="all-clear"><i />NO CRITICAL SIGNALS<span>within current rule set</span></div>}
        <div className="confidence-readout"><span>ANNUAL INTERVAL</span><strong>±{formatNumber(interval, 1)}%</strong><small>P10—P90 half-span</small></div>
      </section>
      <section className="instrument grid-span-full carbon-stream-panel">
        <InstrumentHeader code="MC.03" title="Carbon-avoidance stream" meta="HOURLY DISPLACEMENT PROXY" />
        <div className="carbon-stream">{result.hours.filter((_, index) => index % 168 === 0).map((point) => <i key={point.index} style={{ height: `${clamp(point.acKw / Math.max(1, scenario.capacityKw) * 100, 2, 100)}%` }} />)}</div>
      </section>
    </div>
  );
}

export function WorkspaceStage(props: WorkspaceProps) {
  switch (props.workspaceId) {
    case "DT": return <DigitalTwinWorkspace {...props} />;
    case "WA": return <WeatherWorkspace {...props} />;
    case "ML": return <ModelWorkspace {...props} />;
    case "RV": return <ReplayWorkspace {...props} />;
    case "AE": return <EngineeringWorkspace {...props} />;
    case "SR": return <ScenarioWorkspace {...props} />;
    case "BE": return <BatteryWorkspace {...props} />;
    case "RM": return <RegionalWorkspace {...props} />;
    case "CL": return <ClimateWorkspace {...props} />;
    case "FI": return <FinancialWorkspace {...props} />;
    case "PA": return <ProvenanceWorkspace {...props} />;
    case "RP": return <PublicationWorkspace {...props} />;
    case "MC": return <MissionControlWorkspace {...props} />;
    case "AF":
    default: return <AnnualWorkspace {...props} />;
  }
}

export { EnergyFlowDiagram, InstrumentHeader, LifeTag, Metric };
