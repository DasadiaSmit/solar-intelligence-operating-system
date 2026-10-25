"use client";

import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useSolarExperience } from "@/components/hero/SolarExperience";
import { activationRequestForObservatoryPosition } from "@/features/application-activation";
import type { SunlitFrame } from "@/features/sunlit-observatory/frame";
import { SunlitIcon, type SunlitIconName } from "./SunlitIcon";
import styles from "./SunlitObservatory.module.css";

const Scene = lazy(() => import("./SunlitScene"));
type Mode = "overview" | "array" | "battery";
type Panel = "instruments" | "source" | "settings" | "scenario" | "site" | null;
const MODES = ["overview", "array", "battery"] as const;
const DETAILS = {
  overview: { title: "Solar overview", subtitle: "One system. One linked moment.", icon: "overview" as const },
  array: { title: "Array engineering", subtitle: "Orientation meets sunlight.", icon: "array" as const },
  battery: { title: "Battery & energy flow", subtitle: "Follow the selected hour’s energy.", icon: "battery" as const },
};
const INSTRUMENTS: { title: string; detail: string; icon: SunlitIconName; position: number }[] = [
  { title: "Solar digital twin", detail: "Explore the configured solar system", icon: "cube", position: 0 },
  { title: "Atmospheric observation", detail: "Weather, irradiance and data quality", icon: "weather", position: 1 },
  { title: "Annual energy", detail: "All 8,760 hours of the modelled year", icon: "chart", position: 2 },
  { title: "Array engineering", detail: "Orientation, sunlight and conversion", icon: "array", position: 3 },
  { title: "Scenario comparison", detail: "Baseline and deterministic stress cases", icon: "compare", position: 4 },
  { title: "Battery & energy flow", detail: "Storage, demand and grid allocation", icon: "battery", position: 5 },
];
const number = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
const time = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });
const date = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
function motionSubscribe(fn: () => void) { const q = window.matchMedia("(prefers-reduced-motion: reduce)"); q.addEventListener("change", fn); return () => q.removeEventListener("change", fn); }
function motionSnapshot() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
function fallbackSnapshot() { return false; }
function ScenePlaceholder() { return <div className={styles.scenePlaceholder} aria-hidden="true"><div /><span>HELIOS</span></div>; }
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <ScenePlaceholder /> : this.props.children; }
}
function GlassDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => { const dialog = ref.current; const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null; dialog?.showModal(); return () => { dialog?.close(); previous?.focus({ preventScroll: true }); }; }, []);
  return <dialog ref={ref} className={styles.dialog} aria-labelledby="sunlit-dialog-title" onCancel={() => close.current()} onClick={(event) => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close.current(); } }}><header><div><span className={styles.eyebrow}>SOLAR INTELLIGENCE</span><h2 id="sunlit-dialog-title">{title}</h2></div><button type="button" className={styles.circleButton} onClick={onClose} aria-label="Close dialog"><SunlitIcon name="close" /></button></header>{children}</dialog>;
}

export function SunlitObservatory({ initialFrame, legacyHero }: { initialFrame: SunlitFrame; legacyHero?: ReactNode }) {
  const experience = useSolarExperience();
  const active = experience.phase !== "application";
  const { setLinkedSelectedIndex } = experience;
  const [mode, setMode] = useState<Mode>("overview");
  const [frame, setFrame] = useState(initialFrame);
  const [selectedIndex, setSelectedIndex] = useState(initialFrame.initialIndex);
  const [panel, setPanel] = useState<Panel>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [legacy, setLegacy] = useState(false);
  const [motion, setMotion] = useState<"system" | "reduced">("system");
  const [quality, setQuality] = useState<"balanced" | "low">("balanced");
  const [preferencesReady, setPreferencesReady] = useState(false);
  const systemMotion = useSyncExternalStore(motionSubscribe, motionSnapshot, fallbackSnapshot);
  const reducedMotion = systemMotion || motion === "reduced";
  const request = useRef<AbortController | null>(null);
  const cache = useRef(new Map([[initialFrame.dateUtc, initialFrame]]));
  const previousPhase = useRef(experience.phase);
  const hour = frame.hours.find((row) => row.index === selectedIndex) ?? frame.hours[12] ?? frame.hours[0];
  const offset = frame.hours.indexOf(hour);
  const timeLabel = `${time.format(new Date(hour.timestampUtc))} UTC`;
  const details = DETAILS[mode];

  const selectHour = useCallback((index: number) => { setSelectedIndex(index); setLinkedSelectedIndex(index); }, [setLinkedSelectedIndex]);
  const loadDay = useCallback(async (nextDate: string, targetIndex?: number) => {
    request.current?.abort();
    setPlaying(false);
    setError("");
    const applyFrame = (next: SunlitFrame) => { const target = next.hours.find((row) => row.index === targetIndex) ?? next.hours[Math.min(23, offset)] ?? next.hours[12]; setFrame(next); selectHour(target.index); };
    const cached = cache.current.get(nextDate);
    if (cached) { applyFrame(cached); setLoading(false); return; }
    const controller = new AbortController(); request.current = controller; setLoading(true);
    try {
      const response = await fetch(`/api/v1/observatory?date=${encodeURIComponent(nextDate)}`, { signal: controller.signal });
      const payload = await response.json() as { ok?: boolean; data?: SunlitFrame };
      if (!response.ok || !payload.ok || !payload.data || payload.data.schemaVersion !== "1.0.0" || !Array.isArray(payload.data.hours) || payload.data.hours.length !== 24) throw new Error("This day could not be loaded. Your current observation is preserved.");
      if (controller.signal.aborted) return;
      const next = payload.data as SunlitFrame;
      cache.current.set(nextDate, next);
      if (cache.current.size > 8) { const oldest = cache.current.keys().next().value; if (oldest) cache.current.delete(oldest); }
      applyFrame(next);
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load this observation."); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [offset, selectHour]);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const previous = previousPhase.current; previousPhase.current = experience.phase;
    if (experience.phase === "application") { request.current?.abort(); return; }
    if (previous !== "application" || experience.linkedSelectedIndex === null) return;
    const index = experience.linkedSelectedIndex;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLegacy(false);
      setLoading(false);
      if (frame.hours.some((row) => row.index === index)) setSelectedIndex(index);
      else { const next = new Date(`${frame.minDateUtc}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + Math.floor(index / 24)); void loadDay(next.toISOString().slice(0, 10), index); }
    });
    return () => { cancelled = true; };
  }, [experience.phase, experience.linkedSelectedIndex, frame.hours, frame.minDateUtc, loadDay]);
  useEffect(() => {
    let alive = true;
    queueMicrotask(() => { if (!alive) return; try { const saved = JSON.parse(localStorage.getItem("sios.sunlit-preferences") ?? "{}"); if (saved.motion === "reduced") setMotion("reduced"); if (saved.quality === "low") setQuality("low"); } catch { /* Device preferences are optional. */ } setPreferencesReady(true); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (preferencesReady) { try { localStorage.setItem("sios.sunlit-preferences", JSON.stringify({ motion, quality })); } catch { /* Private browsing can reject storage. */ } } }, [motion, quality, preferencesReady]);
  useEffect(() => { const stop = () => { if (document.hidden) setPlaying(false); }; document.addEventListener("visibilitychange", stop); return () => document.removeEventListener("visibilitychange", stop); }, []);
  useEffect(() => {
    if (!playing || !active || legacy || loading) return;
    if (offset >= 23) return;
    const id = window.setTimeout(() => { selectHour(frame.hours[offset + 1].index); if (offset + 1 === 23) setPlaying(false); }, reducedMotion ? 1900 : 1250);
    return () => window.clearTimeout(id);
  }, [playing, active, legacy, loading, offset, frame.hours, reducedMotion, selectHour]);

  const chooseMode = (next: Mode) => { setMode(next); setPlaying(false); setPanel(null); };
  const openWorkspace = (position: number) => { const activation = activationRequestForObservatoryPosition(position, hour.index, true); if (activation) { request.current?.abort(); setLoading(false); setPlaying(false); setPanel(null); experience.activateApplication(activation); } };
  const nextDay = (direction: number) => { const value = new Date(`${frame.dateUtc}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + direction); void loadDay(value.toISOString().slice(0, 10)); };
  const navKeys = (event: React.KeyboardEvent<HTMLButtonElement>, current: Mode) => { if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(event.key)) return; event.preventDefault(); const idx = MODES.indexOf(current); const target = event.key === "Home" ? 0 : event.key === "End" ? 2 : (idx + (event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1) + 3) % 3; chooseMode(MODES[target]); document.getElementById(`sunlit-nav-${MODES[target]}`)?.focus(); };
  const sourceEvidence = <><div className={styles.sourceHero}><span className={styles.status}>SIMULATED</span><h3>Every view, the same evidence.</h3><p>The scene is an illustrative lens on the configured baseline. Its values come from the canonical one-hour record, not live plant telemetry.</p></div><dl className={styles.facts}><div><dt>Linked record</dt><dd>{date.format(new Date(hour.timestampUtc))} · {timeLabel} · #{hour.index}</dd></div><div><dt>Provider</dt><dd>{frame.provider}</dd></div><div><dt>Dataset</dt><dd>{frame.datasetVersion}</dd></div><div><dt>Calculation</dt><dd>{frame.calculationVersion}</dd></div><div><dt>Input quality</dt><dd>{number.format(hour.qualityScore * 100)}%</dd></div><div><dt>Result</dt><dd>{frame.resultId}</dd></div></dl><p className={styles.note}>Energy values describe one 3,600-second record. Array geometry, glass and atmosphere are illustrative; no measured site geometry, battery health or live control is implied.</p><button className={styles.primaryButton} onClick={() => openWorkspace(mode === "battery" ? 5 : mode === "array" ? 3 : 2)}>Inspect full evidence <SunlitIcon name="arrow" /></button></>;

  return <>
    {legacy && active && legacyHero ? <><div className={styles.legacyBack}><button className={styles.secondaryButton} onClick={() => { setLegacy(false); experience.setIntroPhase("hero"); }}><SunlitIcon name="back" /> Sunlit observatory</button></div>{legacyHero}</> : null}
    <section className={styles.root} data-active={active && !legacy} data-mode={mode} data-night={hour.solarElevationDeg <= 0} data-motion={reducedMotion ? "reduced" : "full"} aria-label="Sunlit solar observatory" aria-hidden={!active || legacy} inert={!active || legacy}>
      <a className={styles.skipLink} href="#sunlit-stage-title">Skip to observation</a>
      <header className={styles.header}>
        <button className={styles.brand} onClick={() => chooseMode("overview")} aria-label="Solar Intelligence overview"><span className={styles.brandSun} /><strong>SIOS</strong><span>Solar Intelligence</span></button>
        <button className={styles.siteButton} onClick={() => setPanel("site")}><SunlitIcon name="location" /><span>{frame.site.name}</span></button>
        <label className={styles.dateControl}><SunlitIcon name="calendar" /><span className={styles.srOnly}>Observation date in UTC</span><input aria-label="Observation date in UTC" type="date" value={frame.dateUtc} min={frame.minDateUtc} max={frame.maxDateUtc} disabled={loading} onChange={(e) => { if (e.target.value) void loadDay(e.target.value); }} /></label>
        <span className={styles.headerTime}><SunlitIcon name="clock" /><time dateTime={hour.timestampUtc}>{timeLabel}</time></span>
        <span className={styles.status}>{frame.lifecycle}</span>
        <button className={styles.baseline} onClick={() => setPanel("scenario")}><SunlitIcon name="layers" /><span>Baseline</span><SunlitIcon name="chevron" /></button>
        <button className={styles.circleButton} onClick={() => setPanel("settings")} aria-label="Observation settings"><SunlitIcon name="settings" /></button>
      </header>
      <div className={styles.workspace}>
        <nav className={styles.navigation} aria-label="Observation views">
          {MODES.map((item) => <button key={item} id={`sunlit-nav-${item}`} className={`${styles.navButton} ${mode === item ? styles.navActive : ""}`} aria-current={mode === item ? "page" : undefined} data-sunlit-return-focus={mode === item ? "true" : undefined} onClick={() => chooseMode(item)} onKeyDown={(e) => navKeys(e, item)}><span className={styles.navIcon}><SunlitIcon name={DETAILS[item].icon} /></span><span>{item[0].toUpperCase() + item.slice(1)}</span></button>)}
          <button className={styles.allInstruments} onClick={() => setPanel("instruments")}>All instruments <SunlitIcon name="arrow" /></button>
          <span className={styles.navigationNote}>One linked scientific system</span>
        </nav>
        <main className={styles.stage} aria-busy={loading}>
          <div className={styles.stageHeading}><span className={styles.eyebrow}>HELIOS OBSERVATORY / {mode === "overview" ? "OVERVIEW" : mode === "array" ? "04" : "06"}</span><h1 id="sunlit-stage-title" tabIndex={-1}>{details.title}</h1><p>{details.subtitle}</p><span className={styles.stageCaption}>{mode === "array" ? "Configured orientation · illustrative geometry" : mode === "battery" ? "Logical allocation · kWh per one-hour record" : "A sunlit perspective on your scientific system"}</span></div>
          <div className={styles.sceneViewport}>{active && !legacy ? <SceneBoundary><Suspense fallback={<ScenePlaceholder />}><Scene mode={mode} hour={hour} array={frame.array} battery={frame.battery} reducedMotion={reducedMotion} quality={quality} active={active} /></Suspense></SceneBoundary> : null}</div>
          <div className={styles.observationBadge}><span className={hour.isDaylight ? styles.dayDot : styles.nightDot} />{hour.isDaylight ? "Daylight record" : "Night record"}<span>{number.format(hour.solarElevationDeg)}° solar elevation</span></div>
        </main>
      </div>
      <section className={styles.evidence} aria-label="Selected observation summary">
        <h2>{mode === "overview" ? "System at a glance" : mode === "array" ? "Orientation context" : "Linked energy record"}</h2>
        {mode === "overview" ? <><Evidence icon="cube" label="INSTRUMENTS" value="6 mounted" /><Evidence icon="layers" label="WORKSPACES" value="14 connected" /><Evidence icon="source" label="DATA" value="Scientific sample" /></> : mode === "array" ? <><Evidence icon="array" label="ARRAY ORIENTATION" value={`${number.format(hour.arrayTiltDeg)}° tilt · ${number.format(hour.arrayAzimuthDeg)}° azimuth`} /><Evidence icon="sun" label="INCIDENCE" value={`${number.format(hour.incidenceDeg)}°`} /><Evidence icon="chart" label="AC GENERATION" value={`${number.format(hour.generationKWh)} kWh / 1h`} /></> : <><Evidence icon="battery" label="STORED ENERGY" value={`${number.format(hour.batterySocKWh)} / ${number.format(frame.battery.capacityKWh)} kWh`} /><Evidence icon="grid" label="GRID IMPORT" value={`${number.format(hour.gridImportKWh)} kWh / 1h`} /><Evidence icon="arrow" label="GRID EXPORT" value={`${number.format(hour.gridExportKWh)} kWh / 1h`} /></>}
        <button className={styles.primaryButton} disabled={loading} onClick={() => mode === "overview" ? setPanel("instruments") : openWorkspace(mode === "array" ? 3 : 5)}>{mode === "overview" ? "Explore instruments" : mode === "array" ? "Open array workspace" : "Open battery workspace"}<SunlitIcon name="arrow" /></button>
      </section>
      <section className={styles.timeline} aria-label="Linked UTC day timeline">
        <button className={styles.playButton} disabled={loading} onClick={() => { if (offset === 23) selectHour(frame.hours[0].index); setPlaying(!playing); }} aria-label={playing ? "Pause hourly replay" : "Play hourly replay"} aria-pressed={playing}><SunlitIcon name={playing ? "pause" : "play"} /></button>
        <div className={styles.timelineLabel}><strong>Linked hour</strong><span>{date.format(new Date(hour.timestampUtc))}</span></div>
        <div className={styles.rangeWrap}><label className={styles.srOnly} htmlFor="sunlit-hour">Hour in the selected UTC day</label><input id="sunlit-hour" type="range" min={0} max={23} step={1} value={offset} disabled={loading} aria-valuetext={`${timeLabel}; ${number.format(hour.generationKWh)} kilowatt-hours generation; battery ${number.format(hour.batterySocKWh)} kilowatt-hours`} onChange={(e) => { setPlaying(false); selectHour(frame.hours[Number(e.target.value)].index); }} /><div className={styles.rangeScale}><span>00:30</span><span>06:30</span><span>12:30</span><span>18:30</span><span>23:30 UTC</span></div></div>
        <time className={styles.timelineTime} dateTime={hour.timestampUtc}>{timeLabel}</time>
        <div className={styles.dayButtons}><button className={styles.circleButton} disabled={loading || frame.dateUtc === frame.minDateUtc} onClick={() => nextDay(-1)} aria-label="Previous observation day"><SunlitIcon name="back" /></button><button className={styles.circleButton} disabled={loading || frame.dateUtc === frame.maxDateUtc} onClick={() => nextDay(1)} aria-label="Next observation day"><SunlitIcon name="arrow" /></button></div>
        <button className={styles.sourceButton} onClick={() => setPanel("source")}>Source & quality <SunlitIcon name="arrow" /></button>
      </section>
      <footer className={styles.footer}><span>Illustrative atmosphere · canonical hourly data</span><span role="status" aria-live="polite">{loading ? "Loading the selected day…" : error || `${date.format(new Date(hour.timestampUtc))} · ${timeLabel}`}</span></footer>
      {panel && active ? <GlassDialog title={panel === "instruments" ? "Explore your instruments" : panel === "source" ? "Source & quality" : panel === "settings" ? "Observation settings" : panel === "site" ? "Your solar site" : "The configured baseline"} onClose={() => setPanel(null)}>
        {panel === "instruments" ? <><p className={styles.dialogIntro}>Continue with the same selected hour. Every instrument opens its connected analytical workspace.</p><div className={styles.instrumentGrid}>{INSTRUMENTS.map((item) => <button key={item.position} onClick={() => openWorkspace(item.position)}><span className={styles.navIcon}><SunlitIcon name={item.icon} /></span><span><strong>{item.title}</strong><small>{item.detail}</small></span><SunlitIcon name="arrow" /></button>)}</div>{legacyHero ? <div className={styles.tourNote}><p>Explore the six spatial instruments in the guided observatory at its reference observation.</p><button className={styles.secondaryButton} onClick={() => { request.current?.abort(); setLoading(false); setPanel(null); setPlaying(false); setLegacy(true); }}>Open guided observatory <SunlitIcon name="arrow" /></button></div> : null}</> : null}
        {panel === "source" ? sourceEvidence : null}
        {panel === "settings" ? <div className={styles.settings}><p className={styles.dialogIntro}>Tune the presentation. Your scientific results stay the same.</p><label><span><strong>Reduce motion</strong><small>{systemMotion ? "Your system already requests reduced motion." : "Use settled views with minimal transitions."}</small></span><input type="checkbox" checked={reducedMotion} disabled={systemMotion} onChange={(e) => setMotion(e.target.checked ? "reduced" : "system")} /></label><label><span><strong>Rendering detail</strong><small>Lower detail uses less graphics power.</small></span><select value={quality} onChange={(e) => setQuality(e.target.value as "balanced" | "low")}><option value="balanced">Balanced</option><option value="low">Low power</option></select></label><p className={styles.note}>Playback is always started by you and pauses when this view is hidden. Preferences are saved on this device.</p></div> : null}
        {panel === "site" ? <><div className={styles.sourceHero}><SunlitIcon name="location" /><h3>{frame.site.name}</h3><p>The configured reference site for this scientific sample.</p></div><dl className={styles.facts}><div><dt>Coordinates</dt><dd>{number.format(Math.abs(frame.site.latitude))}° {frame.site.latitude >= 0 ? "N" : "S"} · {number.format(Math.abs(frame.site.longitude))}° {frame.site.longitude >= 0 ? "E" : "W"}</dd></div><div><dt>Solar capacity</dt><dd>{number.format(frame.array.capacityKwDc)} kWp DC</dd></div><div><dt>Battery capacity</dt><dd>{number.format(frame.battery.capacityKWh)} kWh</dd></div><div><dt>Calendar</dt><dd>8,760 hourly records · UTC</dd></div></dl><p className={styles.note}>The atmospheric artwork is illustrative, not a photograph or surveyed model of this site.</p></> : null}
        {panel === "scenario" ? <><p className={styles.dialogIntro}>The observatory shows the configured baseline. Explore engineering changes in the analytical workspace, where modified scenarios are clearly labelled as screening results.</p><dl className={styles.facts}><div><dt>Configured capacity</dt><dd>{number.format(frame.array.capacityKwDc)} kWp DC</dd></div><div><dt>Orientation</dt><dd>{number.format(frame.array.tiltDeg)}° tilt · {number.format(frame.array.azimuthDeg)}° azimuth</dd></div><div><dt>Battery</dt><dd>{number.format(frame.battery.capacityKWh)} kWh</dd></div></dl><p className={styles.note}>Any saved scenario branch is preserved when you enter the analytical workspace.</p><button className={styles.primaryButton} onClick={() => openWorkspace(3)}>Explore scenario controls <SunlitIcon name="arrow" /></button></> : null}
      </GlassDialog> : null}
    </section>
  </>;
}
function Evidence({ icon, label, value }: { icon: SunlitIconName; label: string; value: string }) { return <div className={styles.metric}><span className={styles.metricIcon}><SunlitIcon name={icon} /></span><div><span>{label}</span><strong>{value}</strong></div></div>; }
