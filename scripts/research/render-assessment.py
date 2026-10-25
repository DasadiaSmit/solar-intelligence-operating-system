#!/usr/bin/env python3
"""Render a frozen assessment audit into figures and an offline HTML report.

Usage: python render-assessment.py EVIDENCE_DIRECTORY
Requires matplotlib 3.10.7 and Markdown 3.9; no network access is used.
The existing evidence is read-only. A new presentation/ directory is required.
"""

from __future__ import annotations

import base64
import hashlib
import html
import importlib.metadata
import json
import math
import platform
from pathlib import Path
import subprocess
import sys

import markdown
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import BoundaryNorm, ListedColormap
import numpy as np


VARIANT_LABELS = {
    "default": "Default selection",
    "no-persistence": "Persistence term removed",
    "no-continuity": "Continuity term removed",
    "distribution-only": "Distribution score only",
    "omit-2022": "Source year 2022 omitted",
    "omit-2023": "Source year 2023 omitted",
    "omit-2024": "Source year 2024 omitted",
    "omit-2025": "Source year 2025 omitted",
}
INK = "#183544"
BLUE = "#246a8e"
GOLD = "#a86618"
TEAL = "#287f75"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def finite_number(value, name: str) -> float:
    if not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"{name} must be a finite number")
    return float(value)


def verify_evidence(directory: Path):
    manifest_path = directory / "manifest.json"
    manifest = read_json(manifest_path)
    if manifest.get("schema") != "sios-assessment-evidence-1":
        raise ValueError("Unsupported evidence manifest")
    paths = set()
    for item in manifest["files"]:
        name = item["path"]
        if Path(name).name != name or name in paths:
            raise ValueError("Manifest paths must be unique local filenames")
        paths.add(name)
        data = (directory / name).read_bytes()
        if sha256(data) != item["sha256"] or len(data) != item["bytes"]:
            raise ValueError(f"Evidence integrity mismatch: {name}")
    required = {"audit.json", "REPORT.md", "baseline-study-replay.json", "protocol.json", "reproduction.json"}
    if not required <= paths:
        raise ValueError("Incomplete evidence manifest")
    return manifest


def save_figure(fig, output: Path, stem: str):
    fig.savefig(output / f"{stem}.png", dpi=180, bbox_inches="tight", facecolor="white",
                metadata={"Software": "Solar Intelligence OS assessment renderer"})
    fig.savefig(output / f"{stem}.svg", bbox_inches="tight", facecolor="white",
                metadata={"Date": None, "Creator": "Solar Intelligence OS assessment renderer"})
    plt.close(fig)


def annual_figure(audit, output: Path):
    historical = audit["historical"]
    variants = audit["variants"]
    mean = finite_number(audit["historicalMeanKWh"], "historical mean")
    rows = [(str(row["year"]), row["annualKWh"], "#687c88") for row in historical]
    rows += [(VARIANT_LABELS[row["id"]], row["annualKWh"],
              BLUE if row["id"] == "default" else GOLD if row["id"].startswith("omit-") else TEAL)
             for row in variants]
    positions = [i if i < len(historical) else i + 0.8 for i in range(len(rows))]
    values = [finite_number(row[1], "annual energy") for row in rows]
    low, high = min(values + [mean]), max(values + [mean])
    span = max(high - low, 1000)
    fig, ax = plt.subplots(figsize=(11.6, 7.8))
    ax.axvline(mean, color=INK, linestyle="--", linewidth=1.3,
               label=f"Four-year mean: {mean:,.0f} kWh", zorder=1)
    for y, (label, value, color) in zip(positions, rows):
        ax.scatter(value, y, s=68, color=color, edgecolor="white", linewidth=0.8, zorder=3)
        ax.annotate(f"{value:,.0f}", (value, y), xytext=(9, 0), textcoords="offset points",
                    va="center", fontsize=10, color=INK,
                    bbox={"facecolor": "white", "edgecolor": "none", "pad": 1.5})
    ax.axhline(len(historical) - 0.1, color="#cbd7dc", linewidth=1)
    ax.set_yticks(positions, [row[0] for row in rows])
    ax.invert_yaxis()
    ax.set_xlim(low - 0.08 * span, high + 0.26 * span)
    ax.set_xlabel("Annual AC energy (kWh) — physics-derived generation")
    ax.set_title("How much does the annual estimate depend on the weather sample?", loc="left", pad=18)
    ax.grid(axis="x", color="#e5ecef", linewidth=0.8)
    ax.set_axisbelow(True)
    ax.legend(loc="lower right", frameon=True, facecolor="white", edgecolor="#d9e4e9")
    fig.text(0.02, 0.015,
             "Upper group: individual historical years. Lower group: constructed representative-year cases.\n"
             "All rows use the baseline array. Omitted-year spread is sensitivity, not a confidence interval.",
             fontsize=9, color="#4b6270")
    fig.tight_layout(rect=(0, 0.06, 1, 1))
    save_figure(fig, output, "01-annual-sensitivity")


def regret_figure(audit, output: Path):
    choice = audit["choice"]
    candidates = audit["candidates"]
    cases = choice["cases"]
    matrix = np.array([case["regretKWh"] for case in cases], dtype=float).T
    if matrix.shape != (len(candidates), len(cases)) or not np.isfinite(matrix).all() or (matrix < 0).any():
        raise ValueError("Invalid regret matrix")
    labels = []
    for candidate in candidates:
        tags = []
        if candidate["id"] in choice["nominalWinnerIds"]:
            tags.append("nominal")
        if candidate["id"] in choice["robustWinnerIds"]:
            tags.append("robust")
        suffix = f"  [{', '.join(tags)}]" if tags else ""
        labels.append(f"{candidate['tiltDeg']:g}° tilt / {candidate['azimuthDeg']:g}° azimuth{suffix}")
    maximum = max(float(matrix.max()), 1)
    fig, ax = plt.subplots(figsize=(11.6, 7.8))
    im = ax.imshow(matrix, cmap="cividis", vmin=0, vmax=maximum, aspect="auto")
    for row in range(matrix.shape[0]):
        for col in range(matrix.shape[1]):
            ax.text(col, row, f"{matrix[row, col]:,.0f}", ha="center", va="center", fontsize=11,
                    color="white" if matrix[row, col] / maximum < 0.48 else INK)
    ax.set_xticks(range(len(cases)), [case["id"] for case in cases])
    ax.set_yticks(range(len(candidates)), labels)
    ax.set_xlabel("Historical weather year")
    ax.set_title("Energy left behind by each tested array option", loc="left", pad=18)
    ax.set_xticks(np.arange(-0.5, len(cases), 1), minor=True)
    ax.set_yticks(np.arange(-0.5, len(candidates), 1), minor=True)
    ax.grid(which="minor", color="white", linewidth=1.2)
    ax.tick_params(which="minor", bottom=False, left=False)
    bar = fig.colorbar(im, ax=ax, pad=0.035)
    bar.set_label("Regret: best tested option minus this option (kWh)")
    fig.text(0.02, 0.015,
             "Lower is better. Regret is calculated separately within each year, across the same equal-capacity grid.\n"
             "The robust rule minimises the maximum value in a row; this is a finite-scenario comparison.",
             fontsize=9, color="#4b6270")
    fig.tight_layout(rect=(0, 0.06, 1, 1))
    save_figure(fig, output, "02-array-energy-regret")


def month_figure(audit, output: Path):
    variants = audit["variants"]
    years = [row["year"] for row in audit["historical"]]
    year_index = {year: index for index, year in enumerate(years)}
    selected = []
    for variant in variants:
        choices = [row for row in variant["diagnostics"]["candidates"] if row["selected"]]
        if sorted(row["month"] for row in choices) != list(range(1, 13)):
            raise ValueError(f"Expected one selected candidate for every month: {variant['id']}")
        selected.append([row["year"] for row in sorted(choices, key=lambda row: row["month"])])
    matrix = np.array([[year_index[year] for year in row] for row in selected])
    colors = ["#d5e7ee", "#8eb9c5", "#3c7b90", "#173f58"]
    if len(years) != 4:
        raise ValueError("This protocol requires four historical source years")
    cmap = ListedColormap(colors)
    norm = BoundaryNorm(np.arange(-0.5, len(years) + 0.5), len(years))
    fig, ax = plt.subplots(figsize=(11.6, 6.8))
    ax.imshow(matrix, cmap=cmap, norm=norm, aspect="auto")
    for row in range(matrix.shape[0]):
        for col in range(matrix.shape[1]):
            ax.text(col, row, str(selected[row][col]), ha="center", va="center", fontsize=9,
                    color=INK if matrix[row, col] < 2 else "white")
    ax.set_xticks(range(12), ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])
    ax.set_yticks(range(len(variants)), [VARIANT_LABELS[row["id"]] for row in variants])
    ax.set_xlabel("Month in the constructed representative calendar")
    ax.set_title("Which source year supplies each representative month?", loc="left", pad=18)
    ax.set_xticks(np.arange(-0.5, 12, 1), minor=True)
    ax.set_yticks(np.arange(-0.5, len(variants), 1), minor=True)
    ax.grid(which="minor", color="white", linewidth=1.2)
    ax.tick_params(which="minor", bottom=False, left=False)
    fig.text(0.02, 0.015,
             "Each cell identifies the source year selected by the implemented month-scoring rule.\n"
             "Colour is categorical: it represents source identity, not confidence or better performance.",
             fontsize=9, color="#4b6270")
    fig.tight_layout(rect=(0, 0.07, 1, 1))
    save_figure(fig, output, "03-selected-month-origins")


def render_html(directory: Path, output: Path, audit, study, manifest):
    baseline = next(row for row in audit["variants"] if row["id"] == "default")
    omitted = [row["annualKWh"] for row in audit["variants"] if row["id"].startswith("omit-")]
    reduction = audit["choice"]["worstRegretReductionKWh"]
    if reduction["maximum"] <= 1e-6:
        decision = "The robust selection rule provides no worst-case regret improvement over the nominal choice in these four historical scenarios."
    else:
        decision = ("The robust selection rule reduces worst-case regret by "
                    f"{reduction['minimum']:,.2f}–{reduction['maximum']:,.2f} kWh in the four historical scenarios "
                    "used to choose it. This does not establish future performance.")
    headings = [
        ("01-annual-sensitivity", "Annual energy sensitivity", "Annual estimates for the baseline array, including all four historical years, scoring ablations and source-year omissions. The dashed line is the mean of the four historical simulations."),
        ("02-array-energy-regret", "Array choices across source years", "The shortfall from the best tested option in each year. All nine options have equal DC capacity and the same inverter and loss settings. The grid does not establish a global optimum."),
        ("03-selected-month-origins", "Trace every selected month", "The actual month-selection decisions behind the annual results. Source-year omissions and scoring changes may alter this composition; every selected year is directly recorded in the audit."),
    ]
    figures = []
    for stem, title, caption in headings:
        image = base64.b64encode((output / f"{stem}.png").read_bytes()).decode("ascii")
        figures.append(f'<figure><h3>{html.escape(title)}</h3><img src="data:image/png;base64,{image}" alt="{html.escape(caption, quote=True)}"><figcaption>{html.escape(caption)}</figcaption></figure>')
    report_markdown = (directory / "REPORT.md").read_text(encoding="utf-8")
    report_body = markdown.markdown(html.escape(report_markdown, quote=False), extensions=["tables", "fenced_code"])
    site = html.escape(study["configuration"]["location"]["name"])
    capacity = study["configuration"]["array"]["capacityKwDc"]
    generated_date = html.escape(manifest["generatedAtUtc"].split("T")[0])
    source_commit = html.escape(manifest["sourceCommit"])
    study_id = html.escape(study["studyId"])
    report = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>Solar estimate and design stability — evidence report</title>
<style>
:root{{--ink:#183544;--muted:#536b79;--paper:#f4f7f8;--blue:#246a8e;--line:#d9e4e9;--gold:#a86618}}
*{{box-sizing:border-box}}body{{margin:0;color:var(--ink);background:var(--paper);font:17px/1.65 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}}
main{{max-width:1120px;margin:auto;padding:48px 28px 72px}}header{{padding:24px 0 32px;border-bottom:1px solid var(--line)}}
.eyebrow{{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--blue)}}h1{{font-size:clamp(31px,5vw,53px);line-height:1.12;letter-spacing:-.035em;margin:16px 0 20px;max-width:850px}}
h2{{font-size:27px;line-height:1.25;margin:42px 0 18px}}h3{{font-size:21px;line-height:1.3;margin:0 0 12px}}p{{max-width:90ch}}.lede{{font-size:21px;max-width:760px;color:var(--muted)}}
.meta{{font-size:14px;color:var(--muted)}}.cards{{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:30px 0}}
.card{{background:white;border:1px solid var(--line);border-radius:14px;padding:23px}}.card strong{{display:block;font-size:26px;letter-spacing:-.025em;line-height:1.2;margin:9px 0}}.card span{{font-size:13px;color:var(--muted)}}
.finding{{padding:20px 24px;border-left:4px solid var(--gold);background:#fff6e9;border-radius:0 12px 12px 0}}.finding p{{margin:0}}.finding p+p{{margin-top:10px}}
figure{{margin:24px 0;padding:24px;background:white;border:1px solid var(--line);border-radius:14px;break-inside:avoid}}img{{width:100%;height:auto;display:block}}figcaption{{font-size:14px;color:var(--muted);margin:12px 6px 0}}
article{{background:white;border:1px solid var(--line);border-radius:14px;padding:30px;margin-top:24px}}article h1{{font-size:30px;margin-top:0}}article h2{{font-size:23px;margin-top:32px}}table{{display:block;overflow-x:auto;border-collapse:collapse;width:100%;font-size:13px;margin:20px 0}}th,td{{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left}}th{{background:#eef5f7}}tbody tr:nth-child(even){{background:#f8fafb}}code{{font-size:.86em;overflow-wrap:anywhere;background:#edf3f5;border-radius:4px;padding:2px 4px}}a{{color:var(--blue)}}footer{{margin-top:32px;font-size:13px;color:var(--muted);overflow-wrap:anywhere}}
@media(max-width:720px){{main{{padding:20px 14px 40px}}.cards{{grid-template-columns:1fr}}figure,article{{padding:16px}}.card strong{{font-size:25px}}}}
@media print{{body{{background:white;font-size:11pt}}main{{max-width:none;padding:0}}header{{padding-top:0}}h1{{font-size:30pt}}.cards{{gap:10px}}figure,article{{border-color:#ccc;box-shadow:none}}figure{{padding:10px;page-break-inside:avoid}}article{{padding:16px}}h2,h3{{break-after:avoid}}a{{color:inherit}}}}
</style></head><body><main>
<header><div class="eyebrow">Solar Intelligence OS · Research evidence 01</div>
<h1>How stable is the solar estimate—and the design it recommends?</h1>
<p class="lede">A traceable comparison of representative-year construction and equal-capacity array choices using four historical weather years.</p>
<p class="meta">{site} · {capacity:g} kWp DC research scenario · ERA5, 2022–2025 · {generated_date}</p></header>
<section class="cards" aria-label="Key results">
<div class="card"><span>Default representative estimate</span><strong>{baseline['annualKWh']:,.0f} kWh</strong><span>Physics-derived annual AC generation</span></div>
<div class="card"><span>Omit-one-year sensitivity range</span><strong>{min(omitted):,.0f}–{max(omitted):,.0f}</strong><span>kWh; not a confidence interval</span></div>
<div class="card"><span>Array pairs that change order</span><strong>{len(audit['choice']['rankReversals'])} pairs</strong><span>Across the four historical weather years</span></div>
</section>
<div class="finding"><p><strong>Decision finding.</strong> {html.escape(decision)}</p><p><strong>Interpretation.</strong> These are retrospective simulations of a hypothetical installation. They do not establish measured-plant accuracy, issue-time forecast skill or a financial optimum.</p></div>
<section aria-label="Scientific figures"><h2>Inspect the evidence</h2>{''.join(figures)}</section>
<section aria-label="Full analytical report"><h2>Full analytical report</h2><article>{report_body}</article></section>
<footer><p>Data: Open-Meteo / ECMWF ERA5. <a href="https://open-meteo.com/en/docs/historical-weather-api">Historical Weather API documentation</a>. Source-year simulations are aligned to a no-leap calendar; the original 2024 source retains its leap-day records in the frozen inputs.</p>
<p>Study <code>{study_id}</code><br>Analysis source <code>{source_commit}</code><br>All figures and text are embedded in this HTML file. The adjoining PNG/SVG figures can be used in the report or poster. Exact values, selected months and file hashes remain in the evidence files and presentation manifest.</p></footer>
</main></body></html>'''
    (output / "REPORT.html").write_text(report, encoding="utf-8")


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: render-assessment.py EVIDENCE_DIRECTORY")
    directory = Path(sys.argv[1]).expanduser().resolve()
    manifest = verify_evidence(directory)
    audit = read_json(directory / "audit.json")
    study = read_json(directory / "baseline-study-replay.json")
    if audit.get("version") != "sios-representative-audit-1" or audit.get("sourceMode") != "live":
        raise ValueError("Expected the live version-1 audit")
    if {row["id"] for row in audit["variants"]} != set(VARIANT_LABELS) or len(audit["variants"]) != 8:
        raise ValueError("Expected all eight protocol variants")
    if [row["year"] for row in audit["historical"]] != [2022, 2023, 2024, 2025]:
        raise ValueError("Expected source years 2022–2025 in order")
    output = directory / "presentation"
    output.mkdir(exist_ok=False)
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10.5, "axes.titlesize": 15,
                         "axes.titleweight": "bold", "axes.labelsize": 11, "text.color": INK,
                         "axes.labelcolor": INK, "xtick.color": INK, "ytick.color": INK,
                         "axes.spines.top": False, "axes.spines.right": False,
                         "svg.fonttype": "none", "svg.hashsalt": "sios-assessment-presentation-1"})
    annual_figure(audit, output)
    regret_figure(audit, output)
    month_figure(audit, output)
    render_html(directory, output, audit, study, manifest)
    inputs = ["manifest.json", "audit.json", "REPORT.md", "baseline-study-replay.json", "protocol.json", "reproduction.json"]
    generated = [{"path": path.name, "sha256": sha256(path.read_bytes()), "bytes": path.stat().st_size}
                 for path in sorted(output.iterdir()) if path.is_file()]
    renderer_root = Path(__file__).resolve().parents[2]
    try:
        renderer_commit = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=renderer_root, text=True).strip()
        renderer_uncommitted = bool(subprocess.check_output(
            ["git", "diff", "HEAD", "--", str(Path(__file__).resolve())],
            cwd=renderer_root, text=True))
    except (OSError, subprocess.CalledProcessError):
        renderer_commit = None
        renderer_uncommitted = None
    presentation_manifest = {
        "schema": "sios-assessment-presentation-1",
        "analysisSourceCommit": manifest["sourceCommit"],
        "rendererSourceCommit": renderer_commit,
        "rendererHasUncommittedChanges": renderer_uncommitted,
        "rendererSha256": sha256(Path(__file__).read_bytes()),
        "rendererPath": "scripts/research/render-assessment.py",
        "runtime": {"python": platform.python_version(), "matplotlib": matplotlib.__version__,
                    "Markdown": importlib.metadata.version("Markdown"), "numpy": np.__version__},
        "inputs": [{"path": "../" + name, "sha256": sha256((directory / name).read_bytes())} for name in inputs],
        "files": generated,
        "interpretation": "Figures visualise frozen retrospective physics-derived evidence. No measured production, future probabilities or global optimality are claimed.",
    }
    (output / "presentation-manifest.json").write_text(json.dumps(presentation_manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output), "files": len(generated) + 1, "report": str(output / "REPORT.html")}))


if __name__ == "__main__":
    main()
