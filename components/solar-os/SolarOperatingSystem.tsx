"use client";

import type { OperatingSnapshotInput } from "./model";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { OrbitalTimeline } from "./instruments";
import {
  clamp,
  deriveScenario,
  formatCompact,
  formatNumber,
  formatTimestamp,
  normalizeSnapshot,
  numberOf,
  recordOf,
  type ScenarioConfig,
} from "./model";
import {
  LifeTag,
  Metric,
  WORKSPACES,
  WorkspaceStage,
} from "./workspaces";

type InspectorTab = "inspect" | "compare" | "losses" | "provenance";
type ThemeMode = "observatory" | "daylight";

const INSPECTOR_TABS: InspectorTab[] = ["inspect", "compare", "losses", "provenance"];

function validSavedNumber(record: Record<string, unknown>, key: keyof ScenarioConfig, fallback: number, min: number, max: number): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

function restoreScenario(value: unknown, fallback: ScenarioConfig): ScenarioConfig {
  const saved = recordOf(value);
  const currency = typeof saved.currency === "string" && /^[A-Za-z]{3,8}$/.test(saved.currency.trim())
    ? saved.currency.trim().toUpperCase()
    : fallback.currency;

  return {
    capacityKw: validSavedNumber(saved, "capacityKw", fallback.capacityKw, Math.max(.5, fallback.capacityKw * .25), Math.max(5, fallback.capacityKw * 2.5)),
    tiltDeg: validSavedNumber(saved, "tiltDeg", fallback.tiltDeg, 0, 70),
    azimuthDeg: validSavedNumber(saved, "azimuthDeg", fallback.azimuthDeg, 0, 359),
    systemLossPct: validSavedNumber(saved, "systemLossPct", fallback.systemLossPct, 0, 38),
    batteryKwh: validSavedNumber(saved, "batteryKwh", fallback.batteryKwh, 0, Math.max(20, fallback.batteryKwh * 3)),
    importPrice: validSavedNumber(saved, "importPrice", fallback.importPrice, 0, .8),
    exportPrice: validSavedNumber(saved, "exportPrice", fallback.exportPrice, 0, .4),
    carbonKgPerKwh: validSavedNumber(saved, "carbonKgPerKwh", fallback.carbonKgPerKwh, 0, 5),
    currency,
  };
}

function formatCoordinate(value: number, positive: "N" | "E", negative: "S" | "W"): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${formatNumber(Math.abs(safeValue), 3)}°${safeValue < 0 ? negative : positive}`;
}

function useDialogFocus(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const initialTarget = container.querySelector<HTMLElement>("[data-autofocus]")
      ?? container.querySelector<HTMLElement>(focusableSelector)
      ?? container;
    initialTarget.focus();

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", trapFocus);
    return () => {
      container.removeEventListener("keydown", trapFocus);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [containerRef]);
}

export function SolarOperatingSystem({ snapshot }: { snapshot: OperatingSnapshotInput }) {
  const base = useMemo(() => normalizeSnapshot(snapshot), [snapshot]);
  const [workspaceId, setWorkspaceId] = useState("AF");
  const [scenario, setScenario] = useState<ScenarioConfig>(() => base.config);
  const [selectedIndex, setSelectedIndex] = useState(() => clamp(171 * 24 + 12, 0, Math.max(0, base.hours.length - 1)));
  const [theme, setTheme] = useState<ThemeMode>("observatory");
  // Begin closed so the server-rendered tree can never cover a compact viewport.
  // The mount effect opens it for desktop viewports after matchMedia resolves.
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("inspect");
  const [focusMode, setFocusMode] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [replayStep, setReplayStep] = useState(3);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [annotationOpen, setAnnotationOpen] = useState(false);
  const [annotations, setAnnotations] = useState<Array<{ index: number; note: string }>>([]);
  const [toast, setToast] = useState("");
  const [online, setOnline] = useState(true);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const result = useMemo(() => deriveScenario(base, scenario), [base, scenario]);
  const current = result.hours[clamp(selectedIndex, 0, Math.max(0, result.hours.length - 1))];
  const activeWorkspace = WORKSPACES.find((workspace) => workspace.id === workspaceId) ?? WORKSPACES[1];
  const configRaw = recordOf((snapshot as unknown as Record<string, unknown>).config);
  const location = recordOf(configRaw.location);
  const statusRaw = recordOf((snapshot as unknown as Record<string, unknown>).status);
  const simulatedSample = Boolean(statusRaw.deterministic) || /sample|simulat/i.test(`${base.mode} ${base.provider}`);
  const isNight = !current || current.ghi <= 4;
  const isClouded = (current?.cloud ?? 0) > 0.72;
  const isExtreme = (current?.tempC ?? 0) >= 38 || ((current?.cloud ?? 0) > .96 && (current?.quality ?? 1) < .75);
  const lowConfidence = current ? (current.p90Kw - current.p10Kw) / Math.max(.1, current.acKw) > .75 : false;

  useEffect(() => {
    let active = true;
    const updateConnection = () => setOnline(window.navigator.onLine);
    const compactViewport = window.matchMedia("(max-width: 1024px)");
    const updateViewport = (event: MediaQueryListEvent) => {
      if (event.matches) setInspectorOpen(false);
    };
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    compactViewport.addEventListener("change", updateViewport);
    queueMicrotask(() => {
      if (!active) return;
      const savedTheme = window.localStorage.getItem("sios.theme");
      if (savedTheme === "daylight" || savedTheme === "observatory") setTheme(savedTheme);
      const savedView = window.localStorage.getItem("sios.saved-view");
      if (savedView) {
        try {
          const saved = recordOf(JSON.parse(savedView));
          if (typeof saved.workspaceId === "string" && WORKSPACES.some((workspace) => workspace.id === saved.workspaceId)) {
            setWorkspaceId(saved.workspaceId);
          }
          setScenario(restoreScenario(saved.scenario, base.config));
          if (typeof saved.selectedIndex === "number" && Number.isFinite(saved.selectedIndex)) {
            setSelectedIndex(clamp(Math.trunc(saved.selectedIndex), 0, Math.max(0, base.hours.length - 1)));
          }
          if (typeof saved.inspectorTab === "string" && INSPECTOR_TABS.includes(saved.inspectorTab as InspectorTab)) {
            setInspectorTab(saved.inspectorTab as InspectorTab);
          }
        } catch { /* ignore invalid device-local state */ }
      }
      const savedAnnotations = window.localStorage.getItem("sios.annotations");
      if (savedAnnotations) {
        try {
          const parsed = JSON.parse(savedAnnotations);
          if (Array.isArray(parsed)) {
            setAnnotations(parsed.flatMap((value) => {
              const annotation = recordOf(value);
              if (typeof annotation.index !== "number" || !Number.isInteger(annotation.index) || annotation.index < 0 || annotation.index >= base.hours.length || typeof annotation.note !== "string") return [];
              const note = annotation.note.trim().slice(0, 500);
              return note ? [{ index: annotation.index, note }] : [];
            }));
          }
        } catch { /* ignore invalid device-local state */ }
      }
      setInspectorOpen(!compactViewport.matches);
      updateConnection();
      setPreferencesLoaded(true);
    });
    return () => {
      active = false;
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      compactViewport.removeEventListener("change", updateViewport);
    };
  }, [base]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    window.localStorage.setItem("sios.theme", theme);
    document.documentElement.style.colorScheme = theme === "daylight" ? "light" : "dark";
  }, [preferencesLoaded, theme]);

  useEffect(() => {
    if (!playing || !result.hours.length) return;
    const timer = window.setInterval(() => {
      setSelectedIndex((index) => (index + replayStep) % result.hours.length);
    }, 160);
    return () => window.clearInterval(timer);
  }, [playing, replayStep, result.hours.length]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const interactive = Boolean(target?.closest("a[href], button, input, textarea, select, summary, [role='button'], [role='slider'], [role='tab'], [role='menuitem'], [role='dialog'], [contenteditable]:not([contenteditable='false'])"));
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (event.key === "Escape") {
        setPaletteOpen(false); setHelpOpen(false); setAnnotationOpen(false);
        return;
      }
      if (event.defaultPrevented || event.isComposing || event.altKey || event.metaKey || event.ctrlKey || interactive) return;
      if (event.key === "?") { event.preventDefault(); setHelpOpen(true); }
      if (event.key === " ") { event.preventDefault(); setPlaying((value) => !value); }
      if (event.key === "[") setSelectedIndex((value) => clamp(value - 24, 0, Math.max(0, result.hours.length - 1)));
      if (event.key === "]") setSelectedIndex((value) => clamp(value + 24, 0, Math.max(0, result.hours.length - 1)));
      if (event.key.toLowerCase() === "f") setFocusMode((value) => !value);
      if (event.key.toLowerCase() === "p") setInspectorOpen((value) => !value);
      if (event.key.toLowerCase() === "t") setTheme((value) => value === "observatory" ? "daylight" : "observatory");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [result.hours.length]);

  const chooseWorkspace = (id: string) => {
    setWorkspaceId(id);
    setPaletteOpen(false);
  };

  const saveView = () => {
    window.localStorage.setItem("sios.saved-view", JSON.stringify({ workspaceId, scenario, selectedIndex, inspectorTab }));
    setToast("Workspace saved on this device");
  };

  const addAnnotation = (note: string) => {
    if (!note.trim()) return;
    const next = [...annotations, { index: selectedIndex, note: note.trim() }];
    setAnnotations(next);
    window.localStorage.setItem("sios.annotations", JSON.stringify(next));
    setAnnotationOpen(false);
    setToast("Annotation attached to linked hour");
  };

  const handleInspectorTabKey = (event: React.KeyboardEvent<HTMLButtonElement>, tab: InspectorTab) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = INSPECTOR_TABS.indexOf(tab);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? INSPECTOR_TABS.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + INSPECTOR_TABS.length) % INSPECTOR_TABS.length;
    const nextTab = INSPECTOR_TABS[nextIndex];
    setInspectorTab(nextTab);
    event.currentTarget.parentElement?.querySelector<HTMLElement>(`#inspector-tab-${nextTab}`)?.focus();
  };

  return (
    <div
      className={`solar-os ${focusMode ? "focus-mode" : ""} ${inspectorOpen ? "inspector-visible" : "inspector-hidden"}`}
      data-theme={theme}
      data-solar-phase={isNight ? "night" : "day"}
      data-weather-state={isExtreme ? "extreme" : isClouded ? "clouded" : "clear"}
      data-testid="solar-operating-system"
    >
      <a className="skip-link" href="#primary-stage">Skip to primary analysis</a>
      <header className="mission-header">
        <div className="brand-lockup">
          <span className="brand-orbit" aria-hidden="true"><i /></span>
          <div><strong>SOLAR INTELLIGENCE</strong><small>OPERATING SYSTEM / SI·OS</small></div>
        </div>
        <div className="site-identity">
          <span>ACTIVE SITE</span>
          <strong>{String(location.name ?? "Reference solar site")}</strong>
          <small>{formatCoordinate(numberOf(location, ["latitude"], 0), "N", "S")}&nbsp; {formatCoordinate(numberOf(location, ["longitude"], 0), "E", "W")}</small>
        </div>
        <div className="header-telemetry" aria-label="Linked telemetry">
          <span><i className="signal-dot solar" />POA <b>{formatNumber(current?.poa ?? 0)}</b> W/m²</span>
          <span><i className="signal-dot forecast" />AC <b>{formatNumber(current?.acKw ?? 0, 2)}</b> kW</span>
          <span><i className="signal-dot cloud" />CLOUD <b>{formatNumber((current?.cloud ?? 0) * 100)}</b>%</span>
          <span><i className="signal-dot positive" />Q <b>{formatNumber((current?.quality ?? 0) * 100)}</b>%</span>
        </div>
        <div className="mission-actions">
          <button onClick={saveView} aria-label="Save current workspace locally" title="Save workspace">SAVE</button>
          <button onClick={() => setAnnotationOpen(true)} aria-label="Annotate selected hour" title="Annotate linked hour">NOTE</button>
          <button onClick={() => setTheme((value) => value === "observatory" ? "daylight" : "observatory")} aria-label={`Switch to ${theme === "observatory" ? "daylight" : "observatory"} theme`} title="Theme · T">{theme === "observatory" ? "DAY" : "OBS"}</button>
          <button onClick={() => setFocusMode((value) => !value)} aria-pressed={focusMode} title="Focus mode · F">FOCUS</button>
          <button className="command-trigger" onClick={() => setPaletteOpen(true)} aria-label="Open command palette">⌘ K</button>
        </div>
      </header>

      {!focusMode && <nav className="workspace-rail" aria-label="Solar operating system workspaces">
        <div className="rail-index">WS<br /><b>{String(WORKSPACES.findIndex((item) => item.id === workspaceId) + 1).padStart(2, "0")}</b></div>
        <div className="rail-items">
          {WORKSPACES.map((workspace, index) => (
            <button
              key={workspace.id}
              className={workspace.id === workspaceId ? "active" : ""}
              onClick={() => chooseWorkspace(workspace.id)}
              aria-current={workspace.id === workspaceId ? "page" : undefined}
              aria-label={`${workspace.name}, ${workspace.status.toLowerCase()}`}
              data-tooltip={`${String(index + 1).padStart(2, "0")} / ${workspace.shortName}`}
              data-testid={`workspace-nav-${workspace.id}`}
            >
              <span>{workspace.glyph}</span><i className={`status-${workspace.status.toLowerCase()}`} />
            </button>
          ))}
        </div>
        <button className="rail-help" onClick={() => setHelpOpen(true)} aria-label="Open keyboard shortcuts">?</button>
      </nav>}

      <main className="primary-stage" id="primary-stage">
        <header className="stage-heading">
          <div className="stage-coordinate">{activeWorkspace.id}.00 / WORKSPACE</div>
          <div>
            <span className="stage-kicker">{activeWorkspace.shortName}</span>
            <h1>{activeWorkspace.name}</h1>
            <p>{activeWorkspace.description}</p>
          </div>
          <div className="stage-state">
            <LifeTag status={activeWorkspace.status} />
            {result.changed && <LifeTag status="SIMULATED" />}
            {simulatedSample && <span className="sample-marker">SAMPLE / OFFLINE-CAPABLE</span>}
            {lowConfidence && <span className="confidence-warning">LOW CONFIDENCE HOUR</span>}
          </div>
          <button className="mobile-inspector-trigger" onClick={() => setInspectorOpen(true)}>SCENARIO / INSPECT</button>
        </header>
        <div className="stage-scroll">
          {result.hours.length ? (
            <WorkspaceStage
              workspaceId={workspaceId}
              base={base}
              result={result}
              scenario={scenario}
              setScenario={setScenario}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
            />
          ) : (
            <section className="fatal-empty" role="alert"><span>NO ANNUAL RECORDS</span><h2>The operating snapshot contains no hourly data.</h2><p>Provider, model and provenance remain visible in the inspector. Rebuild or reconnect the dataset to activate analytical instruments.</p></section>
          )}
        </div>
      </main>

      {!focusMode && inspectorOpen && <aside className="scientific-inspector" aria-label="Scientific scenario inspector">
        <header className="inspector-title">
          <div><span>INSPECTOR / {workspaceId}</span><strong>Linked scientific state</strong></div>
          <button onClick={() => setInspectorOpen(false)} aria-label="Close inspector">×</button>
        </header>
        <div className="inspector-tabs" role="tablist" aria-label="Inspector views">
          {INSPECTOR_TABS.map((tab) => <button key={tab} id={`inspector-tab-${tab}`} role="tab" aria-selected={inspectorTab === tab} aria-controls={`inspector-panel-${tab}`} tabIndex={inspectorTab === tab ? 0 : -1} onKeyDown={(event) => handleInspectorTabKey(event, tab)} onClick={() => setInspectorTab(tab)}>{tab}</button>)}
        </div>
        <div className="inspector-body" id={`inspector-panel-${inspectorTab}`} role="tabpanel" aria-labelledby={`inspector-tab-${inspectorTab}`} tabIndex={0}>
          {inspectorTab === "inspect" && <InspectTab base={base} result={result} scenario={scenario} setScenario={setScenario} selectedIndex={selectedIndex} current={current} annotations={annotations.filter((item) => item.index === selectedIndex)} />}
          {inspectorTab === "compare" && <CompareTab base={base} result={result} scenario={scenario} />}
          {inspectorTab === "losses" && <LossesTab base={base} result={result} />}
          {inspectorTab === "provenance" && <ProvenanceTab base={base} />}
        </div>
      </aside>}

      <section className="orbital-deck" aria-label="Solar orbital timeline and replay controls">
        <div className="replay-console">
          <span className="deck-code">OT.01</span>
          <button className={playing ? "active" : ""} onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause annual replay" : "Play annual replay"}>{playing ? "Ⅱ" : "▶"}</button>
          <button onClick={() => setSelectedIndex((value) => clamp(value - 24, 0, Math.max(0, result.hours.length - 1)))} aria-label="Previous day">−24h</button>
          <button onClick={() => setSelectedIndex((value) => clamp(value + 24, 0, Math.max(0, result.hours.length - 1)))} aria-label="Next day">+24h</button>
          <label>SPEED<select value={replayStep} onChange={(event) => setReplayStep(Number(event.target.value))}><option value={1}>1×</option><option value={3}>3×</option><option value={12}>12×</option><option value={24}>24×</option></select></label>
        </div>
        <div className="orbital-canvas-wrap"><OrbitalTimeline hours={result.hours} selectedIndex={selectedIndex} onSelect={setSelectedIndex} /></div>
        <div className="linked-time">
          <span>LINKED CURSOR</span><strong>{formatTimestamp(current?.timestamp ?? "")}</strong><small>DAY {String(current?.day ?? 0).padStart(3, "0")} · HOUR {String(current?.hour ?? 0).padStart(2, "0")}:00</small>
        </div>
      </section>

      <footer className="system-ledger" aria-label="System status and legend">
        <span><i className="status-implemented" />IMPLEMENTED</span><span><i className="status-experimental" />EXPERIMENTAL</span><span><i className="status-simulated" />SIMULATED</span><span><i className="status-planned" />PLANNED</span>
        <b>PROVIDER {base.provider}</b><b>MODEL {base.modelName}</b><b>RES {base.resolution}</b><b>Q {formatNumber(result.summary.qualityScore)}%</b><b>CALC {base.calculationVersion}</b><b className={online ? "connection-online" : "connection-offline"}>{online ? "NETWORK ONLINE" : "OFFLINE / SAMPLE ACTIVE"}</b>
        <em>ESTIMATES ARE NOT GUARANTEED PRODUCTION</em>
      </footer>

      {!focusMode && !inspectorOpen && <button className="inspector-reopen" onClick={() => setInspectorOpen(true)}>OPEN INSPECTOR <kbd>P</kbd></button>}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} onChooseWorkspace={chooseWorkspace} setTheme={setTheme} setFocusMode={setFocusMode} setInspectorOpen={setInspectorOpen} openAnnotation={() => setAnnotationOpen(true)} saveView={saveView} />}
      {helpOpen && <ShortcutDialog onClose={() => setHelpOpen(false)} />}
      {annotationOpen && <AnnotationDialog timestamp={current?.timestamp ?? ""} onClose={() => setAnnotationOpen(false)} onSave={addAnnotation} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function RangeControl({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (value: number) => void }) {
  const percent = ((value - min) / Math.max(.0001, max - min)) * 100;
  const controlId = `scenario-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="range-control">
      <span id={`${controlId}-label`}>{label}<output>{formatNumber(value, step < 1 ? 3 : 1)} {unit}</output></span>
      <div className="range-input-row">
        <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(clamp(value - step, min, max))}>−</button>
        <input id={controlId} aria-labelledby={`${controlId}-label`} aria-valuetext={`${formatNumber(value, step < 1 ? 3 : 1)} ${unit}`} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ "--range-progress": `${clamp(percent, 0, 100)}%` } as React.CSSProperties} />
        <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(clamp(value + step, min, max))}>+</button>
      </div>
    </div>
  );
}

function InspectTab({ base, result, scenario, setScenario, current, selectedIndex, annotations }: { base: ReturnType<typeof normalizeSnapshot>; result: ReturnType<typeof deriveScenario>; scenario: ScenarioConfig; setScenario: (value: ScenarioConfig) => void; current?: ReturnType<typeof normalizeSnapshot>["hours"][number]; selectedIndex: number; annotations: Array<{ index: number; note: string }> }) {
  return (
    <>
      <section className="inspector-section">
        <header><span>SC.01</span><h3>Scenario branch</h3>{result.changed && <LifeTag status="SIMULATED" />}</header>
        <RangeControl label="DC CAPACITY" value={scenario.capacityKw} min={Math.max(.5, base.config.capacityKw * .25)} max={Math.max(5, base.config.capacityKw * 2.5)} step={.1} unit="kWp" onChange={(capacityKw) => setScenario({ ...scenario, capacityKw })} />
        <RangeControl label="PANEL TILT" value={scenario.tiltDeg} min={0} max={70} step={1} unit="deg" onChange={(tiltDeg) => setScenario({ ...scenario, tiltDeg })} />
        <RangeControl label="AZIMUTH" value={scenario.azimuthDeg} min={0} max={359} step={1} unit="deg" onChange={(azimuthDeg) => setScenario({ ...scenario, azimuthDeg })} />
        <RangeControl label="SYSTEM LOSS" value={scenario.systemLossPct} min={0} max={38} step={.5} unit="%" onChange={(systemLossPct) => setScenario({ ...scenario, systemLossPct })} />
        <RangeControl label="BATTERY" value={scenario.batteryKwh} min={0} max={Math.max(20, base.config.batteryKwh * 3)} step={.5} unit="kWh" onChange={(batteryKwh) => setScenario({ ...scenario, batteryKwh })} />
        <RangeControl label="IMPORT PRICE" value={scenario.importPrice} min={0} max={.8} step={.005} unit={`${scenario.currency}/kWh`} onChange={(importPrice) => setScenario({ ...scenario, importPrice })} />
        <RangeControl label="EXPORT PRICE" value={scenario.exportPrice} min={0} max={.4} step={.005} unit={`${scenario.currency}/kWh`} onChange={(exportPrice) => setScenario({ ...scenario, exportPrice })} />
        <button className="reset-scenario" onClick={() => setScenario(base.config)} disabled={!result.changed}>RESET TO SCIENTIFIC BASE</button>
      </section>
      <section className="inspector-section">
        <header><span>LK.02</span><h3>Linked hour</h3></header>
        <div className="linked-hour-summary"><strong>{formatTimestamp(current?.timestamp ?? "")}</strong><span>row {formatNumber(selectedIndex + 1)} / {formatNumber(result.hours.length)}</span></div>
        <div className="inspector-metrics"><Metric label="AC GENERATION" value={`${formatNumber(current?.acKw ?? 0, 3)} kW`} tone="solar" /><Metric label="P10—P90" value={`${formatNumber(current?.p10Kw ?? 0, 2)}—${formatNumber(current?.p90Kw ?? 0, 2)}`} detail="kW interval" tone="forecast" /><Metric label="POA" value={`${formatNumber(current?.poa ?? 0)} W/m²`} /><Metric label="LOAD" value={`${formatNumber(current?.loadKw ?? 0, 2)} kW`} /></div>
      </section>
      {annotations.length > 0 && <section className="inspector-section"><header><span>AN.03</span><h3>Annotations</h3></header>{annotations.map((annotation, index) => <p className="annotation-note" key={index}>{annotation.note}</p>)}</section>}
      {result.changed && <section className="simulation-disclosure"><LifeTag status="SIMULATED" /><p>{result.notes[0]}</p></section>}
    </>
  );
}

function CompareTab({ base, result, scenario }: { base: ReturnType<typeof normalizeSnapshot>; result: ReturnType<typeof deriveScenario>; scenario: ScenarioConfig }) {
  const rows = [
    ["Annual generation", base.summary.annualKwh, result.summary.annualKwh, "kWh"],
    ["Specific yield", base.summary.specificYield, result.summary.specificYield, "kWh/kWp"],
    ["Grid import", base.summary.gridImportKwh, result.summary.gridImportKwh, "kWh"],
    ["Grid export", base.summary.gridExportKwh, result.summary.gridExportKwh, "kWh"],
    ["Self-consumption", base.summary.selfConsumptionPct, result.summary.selfConsumptionPct, "%"],
    ["Energy value", base.summary.revenue, result.summary.revenue, scenario.currency],
    ["Carbon avoided", base.summary.carbonKg, result.summary.carbonKg, "kg"],
  ] as const;
  return <section className="inspector-section compare-section"><header><span>CP.01</span><h3>Base / branch comparison</h3></header><table className="compare-table"><thead><tr><th>METRIC</th><th>BASE</th><th>BRANCH</th><th>Δ</th></tr></thead><tbody>{rows.map(([label, baseline, branch, unit]) => <tr key={label}><th>{label}<small>{unit}</small></th><td>{formatCompact(baseline, "")}</td><td>{formatCompact(branch, "")}</td><td className={branch - baseline >= 0 ? "positive" : "negative"}>{baseline ? `${branch - baseline >= 0 ? "+" : ""}${formatNumber(((branch - baseline) / baseline) * 100, 1)}%` : "—"}</td></tr>)}</tbody></table><p className="inspector-footnote">Comparison is recomputed locally from the shared scenario controls. Review the simulation disclosure before interpretation.</p></section>;
}

function LossesTab({ base, result }: { base: ReturnType<typeof normalizeSnapshot>; result: ReturnType<typeof deriveScenario> }) {
  const losses = base.losses;
  return <section className="inspector-section loss-section"><header><span>LS.01</span><h3>Energy-loss waterfall</h3></header>{losses.length ? <div className="loss-waterfall">{losses.map((loss, index) => <div key={`${loss.label}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{loss.label}</strong><div><i style={{ width: `${clamp(loss.pct * 5, 2, 100)}%` }} /></div><b>−{formatNumber(loss.pct, 2)}%</b></div>)}</div> : <p className="inspector-footnote">No loss-chain items were supplied; the interface does not synthesize component losses.</p>}<div className="loss-result"><span>SCENARIO OUTPUT FACTOR</span><strong>{formatNumber(result.productionFactor * 100, 2)}%</strong><small>capacity × orientation × retained losses</small></div></section>;
}

function ProvenanceTab({ base }: { base: ReturnType<typeof normalizeSnapshot> }) {
  return <><section className="inspector-section"><header><span>PV.01</span><h3>Result provenance</h3></header><dl className="provenance-list">{base.provenance.map((row, index) => <div key={`${row.key}-${index}`}><dt>{row.key}</dt><dd>{row.value}</dd>{row.status && <small>{row.status}</small>}</div>)}</dl></section><section className="inspector-section"><header><span>AS.02</span><h3>Assumptions</h3></header>{base.assumptions.length ? <ol className="assumption-list">{base.assumptions.map((assumption, index) => <li key={index}>{assumption}</li>)}</ol> : <p className="inspector-footnote">See the calculation documentation for base assumptions. Local scenario assumptions appear whenever controls change.</p>}</section></>;
}

function CommandPalette({ onClose, onChooseWorkspace, setTheme, setFocusMode, setInspectorOpen, openAnnotation, saveView }: { onClose: () => void; onChooseWorkspace: (id: string) => void; setTheme: React.Dispatch<React.SetStateAction<ThemeMode>>; setFocusMode: React.Dispatch<React.SetStateAction<boolean>>; setInspectorOpen: React.Dispatch<React.SetStateAction<boolean>>; openAnnotation: () => void; saveView: () => void }) {
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef);
  const matches = WORKSPACES.filter((workspace) => `${workspace.id} ${workspace.name} ${workspace.shortName}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="modal-backdrop" onMouseDown={onClose}><div ref={dialogRef} className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}><header><span>COMMAND / GLOBAL</span><button type="button" onClick={onClose} aria-label="Close command palette">ESC</button></header><input data-autofocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Navigate or execute…" aria-label="Search commands" /><div className="command-results"><small>WORKSPACES</small>{matches.map((workspace) => <button type="button" key={workspace.id} onClick={() => onChooseWorkspace(workspace.id)}><i>{workspace.glyph}</i><span>{workspace.name}<small>{workspace.status}</small></span><kbd>↵</kbd></button>)}{!query && <><small>ACTIONS</small><button type="button" onClick={() => { setTheme((value) => value === "observatory" ? "daylight" : "observatory"); onClose(); }}><i>TH</i><span>Toggle visual atmosphere<small>Observatory / daylight</small></span><kbd>T</kbd></button><button type="button" onClick={() => { setFocusMode((value) => !value); onClose(); }}><i>FC</i><span>Toggle focus mode<small>Expand primary instrument field</small></span><kbd>F</kbd></button><button type="button" onClick={() => { setInspectorOpen((value) => !value); onClose(); }}><i>IN</i><span>Toggle inspector<small>Scenario and scientific context</small></span><kbd>P</kbd></button><button type="button" onClick={() => { openAnnotation(); onClose(); }}><i>AN</i><span>Annotate linked hour<small>Attach a device-local scientific note</small></span><kbd>N</kbd></button><button type="button" onClick={() => { saveView(); onClose(); }}><i>SV</i><span>Save workspace locally<small>Device-local preference only</small></span><kbd>⌘S</kbd></button></>}</div></div></div>;
}

function ShortcutDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef);
  const shortcuts = [["⌘ / CTRL + K", "Command palette"], ["?", "Shortcut map"], ["SPACE", "Play / pause replay"], ["[ / ]", "Previous / next day"], ["F", "Focus mode"], ["P", "Inspector"], ["T", "Theme"], ["ESC", "Close overlay"]];
  return <div className="modal-backdrop" onMouseDown={onClose}><div ref={dialogRef} className="shortcut-dialog" role="dialog" aria-modal="true" aria-label="Keyboard shortcut map" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}><header><span>KEYBOARD / FLIGHT DECK</span><button type="button" onClick={onClose} aria-label="Close keyboard shortcut map">×</button></header><h2>Operational shortcuts</h2><div>{shortcuts.map(([keys, action]) => <p key={keys}><kbd>{keys}</kbd><span>{action}</span></p>)}</div></div></div>;
}

function AnnotationDialog({ timestamp, onClose, onSave }: { timestamp: string; onClose: () => void; onSave: (note: string) => void }) {
  const [note, setNote] = useState("");
  const dialogRef = useRef<HTMLFormElement>(null);
  useDialogFocus(dialogRef);
  return <div className="modal-backdrop" onMouseDown={onClose}><form ref={dialogRef} className="annotation-dialog" role="dialog" aria-modal="true" aria-label="Create linked annotation" tabIndex={-1} onSubmit={(event) => { event.preventDefault(); onSave(note); }} onMouseDown={(event) => event.stopPropagation()}><header><span>ANNOTATION / LINKED HOUR</span><button type="button" onClick={onClose} aria-label="Close annotation dialog">×</button></header><strong>{formatTimestamp(timestamp)}</strong><textarea data-autofocus value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record an anomaly, assumption, review note or decision…" maxLength={500} /><footer><small>{note.length} / 500 · stored on this device</small><button type="submit" disabled={!note.trim()}>ATTACH NOTE</button></footer></form></div>;
}
