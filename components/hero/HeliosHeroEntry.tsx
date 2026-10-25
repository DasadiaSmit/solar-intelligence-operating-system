"use client";

import { useState, type ReactNode } from "react";
import type {
  SceneFrameBuildResult,
  SceneFrameV1,
} from "@/features/visual-computing/scene-frame";
import styles from "./HeliosHero.module.css";
import panelStyles from "./HeliosHeroPanels.module.css";

const SUBSYSTEMS = [
  "Observation",
  "Weather",
  "Energy",
  "Forecast",
  "Evidence",
  "Decision",
] as const;

interface HeroFact {
  readonly label: string;
  readonly value: ReactNode;
}

export interface HeliosHeroEntryProps {
  readonly scene: SceneFrameBuildResult;
  readonly reducedMotion: boolean;
  readonly onBeginObservation: () => void;
}

function finiteDisplay(value: number, digits = 1): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "Unavailable";
}

function readyFacts(frame: SceneFrameV1): readonly HeroFact[] {
  return [
    { label: "Scientific status", value: frame.lifecycle },
    {
      label: "Linked observation",
      value: <time dateTime={frame.timestampUtc}>{frame.timestampUtc}</time>,
    },
    {
      label: "Solar elevation",
      value: `${finiteDisplay(frame.sun.elevationDeg)} ${frame.units.angle}`,
    },
    {
      label: "Effective plane-of-array irradiance",
      value: `${finiteDisplay(frame.irradiance.effectivePoaWm2)} ${frame.units.irradiance}`,
    },
    {
      label: "Weather quality score",
      value: `${finiteDisplay(frame.weather.qualityScore * 100, 0)}%`,
    },
    { label: "Source", value: frame.provenance.provider },
    { label: "Dataset", value: frame.provenance.datasetVersion },
    { label: "Calculation", value: frame.provenance.calculationVersion },
  ];
}

function sceneFacts(scene: SceneFrameBuildResult): readonly HeroFact[] {
  if (scene.status === "ready") return readyFacts(scene.frame);
  return [
    { label: "Scientific status", value: "Spatial frame unavailable" },
    {
      label: "Reason",
      value: scene.reason.replaceAll("-", " "),
    },
    { label: "Authoritative view", value: scene.summary },
  ];
}

export function HeliosHeroEntry({
  scene,
  reducedMotion,
  onBeginObservation,
}: HeliosHeroEntryProps) {
  const [overviewOpen, setOverviewOpen] = useState(false);
  const facts = sceneFacts(scene);

  return (
    <>
      <header className={styles.copyBlock} data-hero-entry>
        <p className={styles.eyebrow}>HELIOS OBSERVATORY / ENTRY</p>
        <h1 id="helios-hero-title">
          Solar Intelligence Operating System
        </h1>
        <p className={styles.introduction}>
          Reveal the invisible journey of sunlight—from photon to power,
          from power to prediction, and from prediction to confident
          decisions.
        </p>
        <div className={styles.actions}>
          <button
            className={styles.primaryAction}
            type="button"
            onClick={onBeginObservation}
          >
            Begin Observation
          </button>
          <button
            className={styles.secondaryAction}
            type="button"
            aria-expanded={overviewOpen}
            aria-controls="helios-project-overview"
            onClick={() => setOverviewOpen((open) => !open)}
          >
            Project Overview
          </button>
        </div>
        <p className={styles.motionNote}>
          {reducedMotion
            ? "Reduced motion is active. Observatory positions move to stable views without animated travel."
            : "Scroll to move through the guided camera sequence."}
        </p>
      </header>

      <section
        className={panelStyles.statusPanel}
        aria-labelledby="helios-frame-status"
        data-scene-status={scene.status}
        data-hero-entry
      >
        <p className={panelStyles.panelKicker}>
          LINKED SCIENTIFIC FRAME
        </p>
        <h2 id="helios-frame-status">
          {scene.status === "ready"
            ? "Observation available"
            : "Spatial layer unavailable"}
        </h2>
        <dl>
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <aside
        id="helios-project-overview"
        className={panelStyles.overviewPanel}
        aria-labelledby="helios-overview-title"
        hidden={!overviewOpen}
        data-hero-entry
      >
        <div className={panelStyles.overviewHeading}>
          <div>
            <p className={panelStyles.panelKicker}>PROJECT OVERVIEW</p>
            <h2 id="helios-overview-title">One scientific system</h2>
          </div>
          <button
            type="button"
            className={panelStyles.closeOverview}
            onClick={() => setOverviewOpen(false)}
          >
            Close overview
          </button>
        </div>
        <p>
          The Helios Core is an explanatory mechanism for six connected
          operating-system domains:
        </p>
        <ul className={panelStyles.subsystemList}>
          {SUBSYSTEMS.map((subsystem, index) => (
            <li key={subsystem}>
              <span aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              {subsystem}
            </li>
          ))}
        </ul>
        <p className={panelStyles.limitation}>
          Scientific limitation: the Core and solar surface are
          procedural explanatory visualizations, not resolved
          observations of the physical Sun. They do not alter or replace
          the linked calculations, provenance, or accessible HTML
          instruments.
        </p>
      </aside>
    </>
  );
}
