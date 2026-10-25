"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildAssessmentExport, computeAssessmentSelection, validateAssessmentEvidenceBundle, type AssessmentEvidenceBundle } from "@/lib/research/assessment-evidence";
import { decisionReportHtml, decisionReportHtmlBody } from "@/lib/research/report-html";
import type { WorkspaceId } from "@/lib/mission-intelligence/contracts";
import "./assessment-evidence.css";

type EvidenceContext = {
  bundle: AssessmentEvidenceBundle | null;
  selected: string[] | undefined;
  setSelected: (ids: string[] | undefined) => void;
  status: "idle" | "loading" | "ready" | "error";
  error: string;
  load: () => void;
  navigate: (workspace: WorkspaceId) => void;
};
const Context = createContext<EvidenceContext | null>(null);
const amount = (value: number) => value.toLocaleString("en-GB", { maximumFractionDigits: 2 });

export function AssessmentEvidenceProvider({ children, navigate }: { children: ReactNode; navigate: (workspace: WorkspaceId) => void }) {
  const [bundle, setBundle] = useState<AssessmentEvidenceBundle | null>(null);
  const [selected, setSelected] = useState<string[] | undefined>();
  const [status, setStatus] = useState<EvidenceContext["status"]>("idle");
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const load = async () => {
    if (request.current) return;
    const controller = new AbortController(); request.current = controller;
    setStatus("loading"); setError("");
    try {
      const response = await fetch("/api/v1/studies/assessment", { signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("The saved research evidence is unavailable. Please try again.");
      const payload = await response.json() as { data?: unknown };
      const verified = await validateAssessmentEvidenceBundle(payload.data);
      if (!controller.signal.aborted) { setBundle(verified); setSelected(undefined); setStatus("ready"); }
    } catch (caught) {
      if (!controller.signal.aborted) { setError(caught instanceof Error ? caught.message : "The evidence could not be verified."); setStatus("error"); }
    } finally { if (request.current === controller) request.current = null; }
  };
  return <Context.Provider value={{ bundle, selected, setSelected, status, error, load, navigate }}>{children}</Context.Provider>;
}

export function AssessmentEvidencePanel({ view }: { view: "annual" | "array" | "publication" }) {
  const context = useContext(Context);
  const bundle = context?.bundle;
  const analysis = useMemo(() => bundle ? computeAssessmentSelection(bundle, context?.selected) : null, [bundle, context?.selected]);
  const [downloadStatus, setDownloadStatus] = useState("");
  if (!context) return null;
  const { status, error, load, navigate, setSelected } = context;
  const title = view === "annual" ? "Source-year sensitivity" : view === "array" ? "Evidence-based array comparison" : "Decision report and evidence exports";
  const label = (id: string) => {
    const candidate = bundle?.candidates.find(row => row.id === id);
    return candidate ? `${candidate.tiltDeg}° tilt / ${candidate.azimuthDeg}° azimuth` : id;
  };
  const download = (format: "html" | "md" | "json" | "csv") => {
    if (!bundle || !analysis) return;
    const exported = format === "html"
      ? { filename: buildAssessmentExport(bundle, analysis.candidateIds, "md").filename.replace(/\.md$/, ".html"), mimeType: "text/html;charset=utf-8", content: decisionReportHtml(analysis.reportMarkdown) }
      : buildAssessmentExport(bundle, analysis.candidateIds, format);
    const url = URL.createObjectURL(new Blob([exported.content], { type: exported.mimeType }));
    const link = document.createElement("a"); link.href = url; link.download = exported.filename;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloadStatus(`${format.toUpperCase()} download requested for ${analysis.candidateIds.length} selected designs.`);
  };
  return <section className="instrument assessment-evidence grid-span-full" data-testid={`assessment-${view}`} aria-label={title}>
    <header className="assessment-heading"><div><span>Saved research · Sheffield · 2022–2025</span><h2>{title}</h2></div><span className="life-tag life-experimental">MODELLED EVIDENCE</span></header>
    <p className="assessment-scope">A fixed 48 kWp research case from historical ERA5 weather. Dashboard sliders and the time cursor do not change this saved evidence. No measured production is attached.</p>
    <p className="sr-only" role="status">{status === "ready" ? "Saved Sheffield evidence verified and ready to explore." : status === "loading" ? "Verifying saved evidence." : ""}</p>
    {!bundle && <div className="assessment-load"><p>Inspect the tested designs, source-year sensitivity and the reasoning behind the recommendation.</p><button type="button" disabled={status === "loading"} onClick={load}>{status === "loading" ? "Verifying saved evidence…" : status === "error" ? "Retry saved analysis" : "Open saved Sheffield analysis"}</button></div>}
    {error && <p className="assessment-error" role="alert">{error}</p>}
    {bundle && analysis && <div className="assessment-content">
      <div className="assessment-nav" aria-label="Research evidence views">
        {view !== "annual" && <button type="button" onClick={() => navigate("AF")}>Source-year sensitivity</button>}
        {view !== "array" && <button type="button" onClick={() => navigate("AE")}>Compare tested arrays</button>}
        {view !== "publication" && <button type="button" onClick={() => navigate("RP")}>Open decision report</button>}
      </div>
      {view === "annual" && <>
        <div className="assessment-metrics"><div><span>Original baseline estimate</span><strong>{amount(bundle.baseline.annualKWh)} <small>kWh</small></strong><p>{bundle.baseline.tiltDeg}° tilt · {bundle.baseline.azimuthDeg}° azimuth · {bundle.baseline.capacityKwDc} kWp</p></div><div><span>Leave-one-year-out range</span><strong>{amount(analysis.sensitivity.minimumKWh)}–{amount(analysis.sensitivity.maximumKWh)} <small>kWh</small></strong><p>Sensitivity to source selection; not a confidence interval.</p></div></div>
        <div className="assessment-table" tabIndex={0} role="region" aria-label="Source omission results"><table><caption>Each result rebuilds the baseline representative year with one source year excluded.</caption><thead><tr><th scope="col">Source year excluded</th><th scope="col">Annual generation</th><th scope="col">Change from baseline</th></tr></thead><tbody>{bundle.omissions.map(row => <tr key={row.excludedScenarioId}><th scope="row">{row.excludedScenarioId}</th><td>{amount(row.annualKWh)} kWh</td><td>{bundle.baseline.annualKWh > 0 ? `${amount((row.annualKWh / bundle.baseline.annualKWh - 1) * 100)}%` : "Undefined"}</td></tr>)}</tbody></table></div>
        <p>The omission range belongs to the original baseline configuration. It is separate from the nine-option array comparison and does not describe uncertainty for every design.</p>
      </>}
      {view !== "annual" && <>
        <p className="assessment-selection-note" role="status">Comparing {analysis.candidateIds.length} of {bundle.candidates.length} tested designs across all four historical years. {analysis.candidateIds.length < bundle.candidates.length ? "This selected-design exploration changes the comparison set; the original nine-design study remains unchanged." : "This is the original complete comparison set."}</p>
        <div className="assessment-metrics"><div><span>Highest nominal energy</span><strong>{analysis.choice.nominalWinnerIds.map(label).join("; ")}</strong><p>The highest representative-year yield among the selected designs.</p></div><div><span>Lowest worst-case regret</span><strong>{analysis.choice.robustWinnerIds.map(label).join("; ")}</strong><p>The smallest maximum shortfall from each tested year’s best selected design.</p></div></div>
        <p className="assessment-finding" data-testid="assessment-benefit">{analysis.choice.worstRegretReductionKWh.maximum <= 1e-6 ? "The robust rule adds no regret reduction in this selected set. This is a zero-benefit finding." : `Worst-case regret reduction: ${amount(analysis.choice.worstRegretReductionKWh.minimum)}–${amount(analysis.choice.worstRegretReductionKWh.maximum)} kWh across nominal ties.`} {analysis.choice.rankReversals.length} design pairs reverse order between years. These finite cases are not future probabilities.</p>
        <div className="assessment-sacrifice"><h3>What the robust choice sacrifices</h3>{analysis.choice.nominalYieldSacrificeKWh.map(row => <p key={row.id}>{label(row.id)}: <strong>{amount(row.kWh)} kWh</strong> of nominal energy sacrificed.</p>)}<p>Sacrifice and regret reduction answer different questions; neither is a financial return.</p></div>
      </>}
      {view === "array" && <>
        <fieldset className="assessment-options"><legend>Designs to include in this comparison</legend>{bundle.candidates.map(row => {
          const checked = analysis.candidateIds.includes(row.id);
          return <label key={row.id} className={checked ? "is-included" : ""}><input type="checkbox" checked={checked} disabled={checked && analysis.candidateIds.length === 1} onChange={() => setSelected(checked ? analysis.candidateIds.filter(id => id !== row.id) : [...analysis.candidateIds, row.id])} /><span>{label(row.id)}</span></label>;
        })}<button type="button" onClick={() => setSelected(undefined)} disabled={analysis.candidateIds.length === bundle.candidates.length}>Restore all nine designs</button></fieldset>
        <div className="assessment-table" tabIndex={0} role="region" aria-label="Selected array comparison"><table><caption>All designs share the saved capacity, equipment and loss assumptions. The tested grid is not a global optimum.</caption><thead><tr><th scope="col">Design</th><th scope="col">Nominal generation</th><th scope="col">Worst regret</th><th scope="col">Historical wins</th></tr></thead><tbody>{analysis.choice.candidates.map(row => <tr key={row.id}><th scope="row">{label(row.id)}</th><td>{amount(row.nominalKWh)} kWh</td><td>{amount(row.worstRegretKWh)} kWh</td><td>{row.winnerCount} / 4</td></tr>)}</tbody></table></div>
      </>}
      {view === "publication" && <>
        <div className="assessment-downloads"><button type="button" className="primary-action" onClick={() => download("html")}>Download readable report</button><button type="button" onClick={() => download("md")}>Download Markdown</button><button type="button" onClick={() => download("json")}>Download evidence JSON</button><button type="button" onClick={() => download("csv")}>Download comparison CSV</button></div>
        <p>The readable report opens in a browser and can be printed to PDF. Exports contain the current selected-design comparison, source identities and interpretation limits.</p>
        <p className="assessment-download-status" role="status">{downloadStatus}</p>
        <details className="assessment-report"><summary>Read the current decision report</summary><article dangerouslySetInnerHTML={{ __html: decisionReportHtmlBody(analysis.reportMarkdown) }} /></details>
      </>}
      <details className="assessment-provenance"><summary>Evidence source, configuration and limitations</summary><dl><div><dt>Source</dt><dd>{bundle.source.provider} · {bundle.source.product} · historical reanalysis</dd></div><div><dt>Study</dt><dd>{bundle.source.studyId}</dd></div><div><dt>Verified evidence identity</dt><dd>{bundle.integrity.payloadSha256}</dd></div><div><dt>Scope</dt><dd>Previously inspected 2022–2025 weather; physics-derived generation. Comparisons within this saved study do not establish measured accuracy or human decision benefit.</dd></div></dl><ul>{bundle.limitations.map(item => <li key={item}>{item}</li>)}</ul><a href={bundle.source.attributionUrl} target="_blank" rel="noreferrer">Weather data attribution</a></details>
    </div>}
  </section>;
}
