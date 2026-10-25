"use client";

import type {
  MissionDossierV1,
  MissionSelectionV1,
  MissionSuggestionV1,
  ScientificMemoryV1,
} from "@/lib/mission-intelligence/contracts";

function percentage(value: number | null): string {
  return value === null ? "NOT MEASURED" : `${Math.round(value * 100)}%`;
}

function lifecycleLabel(value: string): string {
  return value.replaceAll("-", " ").toUpperCase();
}

export function MissionLedger({
  dossier,
  previewSelection,
  onSuggestion,
}: {
  dossier: MissionDossierV1;
  previewSelection: MissionSelectionV1 | null;
  onSuggestion: (suggestion: MissionSuggestionV1) => void;
}) {
  const selection = dossier.selection;
  return (
    <div className="mission-ledger" data-mission-status={dossier.status}>
      <section className="mi-command-state" aria-label="Mission context">
        <dl>
          <div><dt>ACTIVE SPECIALIST</dt><dd>{dossier.activeSpecialist.label}</dd></div>
          <div><dt>CURRENT OBJECTIVE</dt><dd>{dossier.objective.label}</dd></div>
          <div><dt>SELECTED OBJECT</dt><dd>{selection?.label ?? "Workspace evidence field"}</dd></div>
          <div><dt>MISSION STATE</dt><dd>{dossier.status.toUpperCase()} · {dossier.version}</dd></div>
          <div><dt>ACTIVE RESULT</dt><dd>{dossier.operatingContext.activeResultId ?? "NO RESULT REGISTERED"}</dd></div>
          <div><dt>ANNUAL STUDY</dt><dd>{dossier.operatingContext.activeStudyId ?? "NO STUDY ACTIVATED"}</dd></div>
          <div><dt>FORECAST MODEL</dt><dd>{dossier.operatingContext.activeModel ? `${dossier.operatingContext.activeModel.name} · ${dossier.operatingContext.activeModel.version}` : "NO MODEL REGISTERED"}</dd></div>
          <div><dt>EXPERIMENT</dt><dd>{dossier.operatingContext.activeExperiment?.name ?? "NO EXPERIMENT ACTIVATED"}</dd></div>
          <div><dt>DATA SNAPSHOTS</dt><dd>{dossier.operatingContext.datasetSnapshotIds.length ? `${dossier.operatingContext.datasetSnapshotIds.length} REGISTERED` : "NO SNAPSHOT ID"}</dd></div>
          <div><dt>SCENARIO</dt><dd>{dossier.operatingContext.activeScenarioHash === dossier.operatingContext.baseScenarioHash ? "BASE / REPRODUCIBLE" : `BRANCH / ${dossier.operatingContext.activeScenarioHash}`}</dd></div>
        </dl>
        {previewSelection && previewSelection.objectId !== selection?.objectId && (
          <p className="mi-preview" role="status"><span>CONTEXT PREVIEW</span>{previewSelection.label}</p>
        )}
        <p className="mi-federation">
          <span>COORDINATED DESKS</span>
          {dossier.collaboratingSpecialists.slice(0, 4).map((specialist) => specialist.label).join(" · ") || "No additional desk required"}
        </p>
      </section>

      <section className="mi-section mi-pipeline" aria-labelledby="mi-pipeline-title">
        <header><span>MI.01</span><h3 id="mi-pipeline-title">Verified analysis pipeline</h3></header>
        <ol aria-label="Mission workflow" aria-busy="false">
          {dossier.workflow.map((step) => (
            <li key={step.id} data-step-status={step.status}>
              <i aria-hidden="true">{step.status === "completed" ? "✓" : step.status === "blocked" ? "!" : "—"}</i>
              <div><strong>{step.label}</strong><small>{step.detail}</small></div>
              <b>{String(step.inputEvidenceRefIds.length).padStart(2, "0")} REF</b>
            </li>
          ))}
        </ol>
        <p className="mi-method-note">These are executable evidence operations and status outputs—not hidden reasoning or a simulated thinking delay.</p>
      </section>

      <section className="mi-section mi-findings" aria-labelledby="mi-findings-title">
        <header><span>MI.02</span><h3 id="mi-findings-title">Grounded findings</h3></header>
        {dossier.findings.map((finding, index) => (
          <article key={finding.id} data-finding-kind={finding.kind}>
            <span>{String(index + 1).padStart(2, "0")} / {finding.kind.toUpperCase()}</span>
            <p>{finding.statement}</p>
            {finding.measurements.length > 0 && (
              <dl>
                {finding.measurements.map((measurement) => (
                  <div key={`${finding.id}:${measurement.factKey}`}>
                    <dt>{measurement.factKey}</dt>
                    <dd>{measurement.value.toLocaleString("en-GB", { maximumFractionDigits: 3 })} {measurement.unit}</dd>
                  </div>
                ))}
              </dl>
            )}
            <small>{finding.evidenceRefIds.length} resolvable evidence reference{finding.evidenceRefIds.length === 1 ? "" : "s"}</small>
          </article>
        ))}
      </section>

      {dossier.continuityAlerts.length > 0 && (
        <section className="mi-section mi-continuity" aria-labelledby="mi-continuity-title">
          <header><span>MI.03</span><h3 id="mi-continuity-title">Scientific continuity</h3></header>
          {dossier.continuityAlerts.map((alert) => (
            <article key={alert.id} data-severity={alert.severity}>
              <strong>{alert.message}</strong>
              <small>{alert.changedDependencies.map((item) => item.label).join(" · ")}</small>
            </article>
          ))}
        </section>
      )}

      <section className="mi-section mi-evidence" aria-labelledby="mi-evidence-title">
        <header><span>MI.04</span><h3 id="mi-evidence-title">Evidence registry</h3></header>
        <ul>
          {dossier.supportingEvidence.slice(0, 12).map((evidence) => (
            <li key={evidence.id} id={`mission-${evidence.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`}>
              <div><strong>{evidence.label}</strong><small>{evidence.provider.name} · {evidence.resolution}</small></div>
              <span>{evidence.unit ?? "TEXT"}</span>
              <b>DQ {evidence.quality.score === null ? "—" : Math.round(evidence.quality.score * 100)}</b>
            </li>
          ))}
        </ul>
      </section>

      <section className="mi-section mi-confidence" aria-labelledby="mi-confidence-title">
        <header><span>MI.05</span><h3 id="mi-confidence-title">Evidence support—not AI confidence</h3></header>
        <div className="mi-support-index">
          <span>MEASURED SUPPORT INDEX</span>
          <strong>{percentage(dossier.confidence.evidenceSupportScore)}</strong>
          <small>{dossier.confidence.notice}</small>
        </div>
        <dl>
          {dossier.confidence.dimensions.map((dimension) => (
            <div key={dimension.id}>
              <dt>{dimension.label}<small>{dimension.basis}</small></dt>
              <dd>{percentage(dimension.score)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mi-section mi-boundary" aria-labelledby="mi-boundary-title">
        <header><span>MI.06</span><h3 id="mi-boundary-title">Assumptions · uncertainty · limitations</h3></header>
        <BoundaryGroup label="ASSUMPTIONS" values={dossier.assumptions} />
        <BoundaryGroup label="UNCERTAINTY" values={dossier.uncertainty} />
        <BoundaryGroup label="LIMITATIONS" values={dossier.limitations} />
        {dossier.warnings.length > 0 && <BoundaryGroup label="WARNINGS" values={dossier.warnings} />}
      </section>

      <section className="mi-section mi-next" aria-labelledby="mi-next-title">
        <header><span>MI.07</span><h3 id="mi-next-title">Next verified operations</h3></header>
        <div>
          {dossier.suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              disabled={suggestion.availability === "blocked"}
              onClick={() => onSuggestion(suggestion)}
              aria-describedby={`mission-suggestion-${suggestion.id}`}
            >
              <span>{suggestion.label}</span>
              <small id={`mission-suggestion-${suggestion.id}`}>{suggestion.rationale}</small>
              <b>{suggestion.targetWorkspaceId} / {suggestion.availability.toUpperCase()}</b>
            </button>
          ))}
        </div>
      </section>

      <footer className="mi-guarantee"><span>{lifecycleLabel(dossier.status)}</span>{dossier.guaranteeNotice}</footer>
    </div>
  );
}

function BoundaryGroup({ label, values }: { label: string; values: readonly string[] }) {
  if (!values.length) return null;
  return (
    <details>
      <summary>{label}<span>{values.length}</span></summary>
      <ul>{values.map((value, index) => <li key={`${label}:${index}`}>{value}</li>)}</ul>
    </details>
  );
}

export function ScientificMemoryLedger({ memory }: { memory: ScientificMemoryV1 }) {
  const openInvestigations = memory.investigations.filter((investigation) => investigation.status === "open");
  return (
    <div className="scientific-memory-ledger">
      <section className="memory-constitution">
        <span>DEVICE-LOCAL SCIENTIFIC WORKING MEMORY</span>
        <strong>REVISION {String(memory.revision).padStart(4, "0")}</strong>
        <small>Structured project state—not conversation history. This local v1 store does not claim cross-device durability.</small>
      </section>
      <section className="mi-section">
        <header><span>SM.01</span><h3>Active scientific state</h3></header>
        <dl className="memory-state">
          <div><dt>SCENARIO HASH</dt><dd>{memory.scenarioHash ?? "UNREGISTERED"}</dd></div>
          <div><dt>MODEL</dt><dd>{memory.selectedModelId ?? "NOT SELECTED"}</dd></div>
          <div><dt>DATASETS</dt><dd>{memory.selectedDatasetIds.join(" · ") || "NOT REGISTERED"}</dd></div>
          <div><dt>ARTIFACTS</dt><dd>{memory.artifacts.length}</dd></div>
        </dl>
      </section>
      <section className="mi-section">
        <header><span>SM.02</span><h3>Unresolved investigations</h3></header>
        {openInvestigations.length ? openInvestigations.map((investigation) => (
          <article className="memory-investigation" key={investigation.id}>
            <strong>{investigation.objective.label}</strong>
            <small>{investigation.unresolvedQuestions.join(" · ") || "Evidence review remains open."}</small>
          </article>
        )) : <p className="memory-empty">No unresolved investigation is registered on this device.</p>}
      </section>
      <section className="mi-section">
        <header><span>SM.03</span><h3>Continuity event ledger</h3></header>
        <ol className="memory-events">
          {[...memory.events].reverse().slice(0, 18).map((event) => (
            <li key={event.id}>
              <span>{event.kind.replaceAll("-", " ").toUpperCase()}</span>
              <strong>{event.label}</strong>
              <small>{new Date(event.occurredAtUtc).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</small>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
