#!/usr/bin/env python3
"""Portable re-evaluation of the preserved Study 03 Markdown reports.

Uses the unchanged, hash-pinned primary extractor and exploratory comparison
functions. No Git history, network, plotting packages or original machine paths
are needed. This does not regenerate reports or rerun a photovoltaic model.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True

SOURCE_PINS = {
    "scripts/research/evaluate-reports.py": "fe5dc66a53f394db2ff5fc42fb7434f0a22b6194f45eb870faf2a54958d35092",
    "scripts/research/evaluate-report-exploration.py": "cd781be21f0a39ec056a2e576e19b4b6a18d4564b86d8104b52a4b968750e626",
    "lib/research/decision-report.ts": "c68e381840869055bd7fb8e2f8acb2cc71875d8b68115d03d2f3b74b20c8b90f",
    "docs/research/assessment-protocol-03.json": "b689786c0bf6dbd90f3ad71eb422e96931f5519ccec205fead3060aa30170660",
}
MANIFEST_PINS = {
    "report-evaluation-2026-10-25-primary-inputs": "b89499f9f662cfdf9543f75a2b8cf38b1c27c1bd652807b71ced734cb482e298",
    "report-evaluation-2026-10-25-primary-results": "11b027dd9e6bde5409197a8d013d58a9a843af451bcc0706aaeb7ac4b2dcbac1",
    "report-evaluation-2026-10-25-exploratory-inputs": "cd4c5abb83290fbeedc537aecdd6b08387ea407edfecd97279714d4302813ab7",
    "report-evaluation-2026-10-25-exploratory-results": "f6b038127eb55d9c6a18525ed008fa82caf87165fe7c8a9057df931bf048b76b",
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_module(path: Path):
    spec = importlib.util.spec_from_file_location("portable_saved_report_rules", path)
    require(spec is not None and spec.loader is not None, "Cannot load verified report rules")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def summarise(base, evaluations, protocol):
    return {
        "primary": base.summarise(evaluations, protocol["primaryCases"]),
        "incomplete": base.summarise(evaluations, protocol["incompleteCases"]),
        "directRendererStress": base.summarise(evaluations, protocol["directRendererStressCases"]),
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("."), help="Application source root")
    parser.add_argument("--evidence", type=Path, default=Path("research-evidence"), help="Folder containing preserved experiment directories")
    parser.add_argument("--output", type=Path, required=True, help="New output directory; existing outputs are never overwritten")
    args = parser.parse_args(argv)
    source, evidence, output = args.source.resolve(), args.evidence.resolve(), args.output.resolve()
    require(not output.exists(), "Output directory already exists; choose a new directory")
    for name, expected in SOURCE_PINS.items():
        path = source / name
        require(path.is_file() and not path.is_symlink(), f"Missing or symlinked source: {name}")
        require(digest(path) == expected, f"Source differs from the preserved rules: {name}")
    for folder, expected in MANIFEST_PINS.items():
        path = evidence / folder / "manifest.json"
        require(path.is_file() and digest(path) == expected, f"Frozen manifest differs: {folder}")

    wrapper = load_module(source / "scripts/research/evaluate-report-exploration.py")
    base = wrapper.BASE
    primary_input = evidence / "report-evaluation-2026-10-25-primary-inputs"
    primary_results = evidence / "report-evaluation-2026-10-25-primary-results"
    exploratory_input = evidence / "report-evaluation-2026-10-25-exploratory-inputs"
    exploratory_results = evidence / "report-evaluation-2026-10-25-exploratory-results"
    # Preserve the original manifest verifier, including extra-file/path checks.
    manifests = {}
    for folder in (primary_input, exploratory_input):
        manifests[folder.name], _ = wrapper.verify_manifest(folder, "sios-report-benchmark-1")
    for folder in (primary_results, exploratory_results):
        manifests[folder.name], _ = wrapper.verify_manifest(folder, "sios-report-evaluation-output-1")

    protocol_path = source / "docs/research/assessment-protocol-03.json"
    primary_manifest, protocol = base.validate_input(primary_input, protocol_path)
    exploratory_manifest, exploratory_protocol = base.validate_input(exploratory_input, protocol_path)
    require(protocol == exploratory_protocol, "Primary and exploratory protocols differ")
    require(exploratory_manifest.get("runKind") == wrapper.RUN_KIND, "Exploratory classification is missing")
    original = read_json(primary_results / "evaluations.json")
    original_exploratory = read_json(exploratory_results / "evaluations.json")
    metadata = read_json(exploratory_input / "source-metadata.json")
    primary_meta = read_json(primary_input / "source-metadata.json")
    require(primary_meta["baselineRendererSha256"] == SOURCE_PINS["lib/research/decision-report.ts"], "Primary renderer identity differs")
    require(read_json(primary_results / "runtime.json")["evaluatorSha256"] == SOURCE_PINS["scripts/research/evaluate-reports.py"], "Primary extractor identity differs")
    require(original["ruleVersion"] == base.RULE_VERSION, "Primary rule version differs")
    primary_hash = MANIFEST_PINS[primary_input.name]
    require(original["inputManifestSha256"] == primary_hash, "Primary result refers to different inputs")
    require(exploratory_manifest["primaryManifestSha256"] == primary_hash, "Exploratory inputs refer to different controls")
    require(metadata["primaryManifestSha256"] == primary_hash, "Exploratory metadata refers to different controls")
    require(metadata["primarySourceCommit"] == primary_manifest["sourceCommit"] == original["sourceCommit"], "Primary source identities differ")
    require(metadata.get("independentValidation") is False, "Exploratory boundary is missing")
    require(metadata["sourceCommit"] == exploratory_manifest["sourceCommit"], "Exploratory source identities differ")
    require(primary_meta["protocolSha256"] == metadata["protocolSha256"] == digest(protocol_path), "Protocol identities differ")
    copied = []
    for entry in primary_manifest["files"]:
        if entry["path"] in {"run-status.json", "source-metadata.json"}:
            continue
        path = exploratory_input / entry["path"]
        require(path.stat().st_size == entry["bytes"] and digest(path) == entry["sha256"], f"Copied control differs: {entry['path']}")
        copied.append(entry["path"])

    statuses = read_json(primary_input / "run-status.json")
    condition_ids = [condition["id"] for condition in protocol["conditions"]]
    primary = []
    require(set(statuses) == {case["id"] for case in protocol["cases"]}, "Primary status case coverage differs")
    for case in protocol["cases"]:
        require(set(statuses[case["id"]]) == set(condition_ids), "Primary condition coverage differs")
        for condition in condition_ids:
            path = primary_input / "reports" / case["id"] / f"{condition}.md"
            primary.append(base.evaluate_report(case, condition, path.read_text(encoding="utf-8"), statuses[case["id"]][condition], protocol["numericTolerance"], protocol["tieToleranceKWh"]))
    require(primary == original["evaluations"], "Recomputed primary fact records differ from retained evidence")
    exploratory, controls = wrapper.evaluate_conditions(exploratory_input, primary_input, protocol, original)
    require(exploratory == original_exploratory["evaluations"], "Recomputed exploratory fact records differ from retained evidence")
    primary_summary, exploratory_summary = summarise(base, primary, protocol), summarise(base, exploratory, protocol)
    require(primary_summary == original["summaries"], "Primary summary differs")
    require(exploratory_summary == original_exploratory["summaries"], "Exploratory summary differs")
    require(controls == 216, "Unexpected number of preserved control facts")

    output.mkdir(parents=True, exist_ok=False)
    result = {
        "schema": "sios-portable-report-replay-1",
        "status": "passed",
        "interpretation": "Portable re-evaluation of the same frozen Markdown reports using unchanged rules; not new cases, report regeneration, photovoltaic validation or human performance evidence.",
        "requiresGitHistory": False,
        "requiresNetwork": False,
        "sourcePins": SOURCE_PINS,
        "manifestPins": MANIFEST_PINS,
        "helperSha256": digest(Path(__file__)),
        "verifiedControlFiles": copied,
        "unchangedControlFactRecords": controls,
        "primaryFactRecords": sum(len(row["facts"]) for row in primary),
        "exploratoryFactRecords": sum(len(row["facts"]) for row in exploratory),
        "primary": primary_summary,
        "exploratory": exploratory_summary,
    }
    (output / "verification.json").write_text(json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    (output / "evaluations.json").write_text(json.dumps({"primary": primary, "exploratory": exploratory}, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    with (output / "fact-scores.csv").open("w", newline="", encoding="utf-8") as stream:
        fields = ["phase", "caseId", "stratum", "condition", "question", "status", "explicitCorrect", "derivableCorrect", "incorrectAssertionCount"]
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for phase, rows in (("primary", primary), ("exploratory", exploratory)):
            for row in rows:
                for fact in row["facts"]:
                    writer.writerow({"phase": phase, **{key: row[key] for key in ("caseId", "stratum", "condition")}, **{key: fact[key] for key in fields[4:]}})
    report = ["# Portable report replay", "", "All retained primary and exploratory fact records reproduce exactly.", "", "| Condition | Explicit correct | Derivable correct | Omitted |", "| --- | ---: | ---: | ---: |"]
    for name, summary in primary_summary["primary"].items():
        counts = summary["counts"]
        report.append(f"| Original {name} | {counts['explicit-correct']} | {counts['derivable-correct']} | {counts['omitted']} |")
    counts = exploratory_summary["primary"]["evidence-v2"]["counts"]
    report.append(f"| Exploratory evidence-v2 | {counts['explicit-correct']} | {counts['derivable-correct']} | {counts['omitted']} |")
    report += ["", "Each row has 48 complete-case facts. Separate incomplete/stale-input cases remain outside that denominator. All 216 original control fact records match. The revised report is evaluated on the same known cases; this establishes software behaviour and explicitness, not improved human decisions.", "", "The original experiments and files are unchanged. This replay uses explicit input folders instead of machine-specific paths and does not require historical Git commits.", ""]
    (output / "REPORT.md").write_text("\n".join(report), encoding="utf-8")
    output_manifest = {"schema": "sios-portable-report-replay-output-1", "files": [{"path": p.name, "bytes": p.stat().st_size, "sha256": digest(p)} for p in sorted(output.iterdir())]}
    (output / "manifest.json").write_text(json.dumps(output_manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "passed", "output": str(output), "primaryFactRecords": result["primaryFactRecords"], "exploratoryFactRecords": result["exploratoryFactRecords"], "unchangedControlFactRecords": controls}))


if __name__ == "__main__":
    main()
