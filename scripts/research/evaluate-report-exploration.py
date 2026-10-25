#!/usr/bin/env python3
"""Evaluate an explicitly exploratory rerun with the unchanged primary parser.

The original three conditions must be byte-identical to the preserved primary
bundle and must produce exactly the original fact records. The fourth condition
is development evidence on known cases, never an independent validation set.
"""
from __future__ import annotations

import argparse
import base64
import csv
import importlib.util
import json
import platform
import re
import subprocess
import sys
from pathlib import Path

RUN_KIND = "exploratory-same-case-regression"
WRAPPER_VERSION = "report-exploration-wrapper-1.0.0"
PARSER_PATH = Path(__file__).with_name("evaluate-reports.py")
SPEC = importlib.util.spec_from_file_location("frozen_report_evaluator", PARSER_PATH)
BASE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BASE)


def verify_manifest(folder, schema):
    """Verify every declared byte and reject extra files, duplicate or unsafe paths."""
    raw = (folder / "manifest.json").read_bytes()
    manifest = json.loads(raw)
    if manifest.get("schema") != schema:
        raise ValueError(f"Unexpected manifest schema at {folder}")
    declared = set()
    for entry in manifest["files"]:
        relative = Path(entry["path"])
        if relative.is_absolute() or ".." in relative.parts or entry["path"] in declared:
            raise ValueError("Unsafe or duplicate manifest path")
        path = folder / relative
        if path.is_symlink() or not path.resolve().is_relative_to(folder.resolve()):
            raise ValueError("Manifest path escapes its bundle")
        contents = path.read_bytes()
        if len(contents) != entry["bytes"] or BASE.digest(contents) != entry["sha256"]:
            raise ValueError(f"Integrity failure: {folder / relative}")
        declared.add(entry["path"])
    actual = {path.relative_to(folder).as_posix() for path in folder.rglob("*")
              if path.is_file() and path != folder / "manifest.json"}
    if actual != declared:
        raise ValueError("Manifest must cover exactly all non-manifest files")
    return manifest, BASE.digest(raw)


def validate_relationships(input_folder, primary_results, protocol_path):
    manifest, protocol = BASE.validate_input(input_folder, protocol_path)
    if manifest.get("runKind") != RUN_KIND:
        raise ValueError("This wrapper accepts only explicitly exploratory inputs")
    primary_manifest, primary_result_hash = verify_manifest(primary_results, "sios-report-evaluation-output-1")
    original = json.loads((primary_results / "evaluations.json").read_text())
    primary_runtime = json.loads((primary_results / "runtime.json").read_text())
    metadata = json.loads((input_folder / "source-metadata.json").read_text())
    if metadata.get("runKind") != RUN_KIND or metadata.get("independentValidation") is not False:
        raise ValueError("Exploratory metadata must explicitly deny independent validation")
    if metadata.get("sourceCommit") != manifest["sourceCommit"] or metadata.get("protocolSha256") != manifest["protocolSha256"]:
        raise ValueError("Exploratory source identities disagree")
    primary_input_hash = manifest.get("primaryManifestSha256")
    if not primary_input_hash or primary_input_hash != metadata.get("primaryManifestSha256"):
        raise ValueError("Exploratory primary-manifest links disagree")
    if original["inputManifestSha256"] != primary_input_hash or primary_manifest["inputManifestSha256"] != primary_input_hash:
        raise ValueError("Supplied primary results do not evaluate the referenced primary input")
    if original["protocolSha256"] != manifest["protocolSha256"] or primary_manifest["protocolSha256"] != manifest["protocolSha256"]:
        raise ValueError("Primary and exploratory protocols differ")
    if metadata.get("primarySourceCommit") != original["sourceCommit"]:
        raise ValueError("Primary source identity differs from preserved evaluation")
    extractor_hash = BASE.digest(PARSER_PATH.read_bytes())
    if extractor_hash != primary_runtime["evaluatorSha256"] or BASE.RULE_VERSION != original["ruleVersion"]:
        raise ValueError("The primary extractor changed; this comparison requires unchanged extraction rules")
    primary_input = Path(original["inputDirectory"])
    original_manifest, original_protocol = BASE.validate_input(primary_input, protocol_path)
    if BASE.digest((primary_input / "manifest.json").read_bytes()) != primary_input_hash:
        raise ValueError("Preserved primary input directory no longer matches its identity")
    if original_manifest["sourceCommit"] != original["sourceCommit"] or original_protocol != protocol:
        raise ValueError("Preserved primary source/protocol mismatch")
    # Verify all copied primary artifacts, including status-record Markdown and
    # the unchanged Sheffield transfer report. Only these two metadata files
    # legitimately change when the fourth condition is added.
    copied = []
    for entry in original_manifest["files"]:
        name = entry["path"]
        if name in {"run-status.json", "source-metadata.json"}:
            continue
        data = (input_folder / name).read_bytes()
        if BASE.digest(data) != entry["sha256"] or len(data) != entry["bytes"]:
            raise ValueError(f"Copied primary artifact changed: {name}")
        copied.append(name)
    return manifest, protocol, original, primary_input, {
        "primaryResultsDirectory": str(primary_results.resolve()),
        "primaryResultsManifestSha256": primary_result_hash,
        "primaryInputDirectory": str(primary_input.resolve()),
        "primaryInputManifestSha256": primary_input_hash,
        "primarySourceCommit": original["sourceCommit"],
        "unchangedExtractorSha256": extractor_hash,
        "unchangedExtractorRuleVersion": BASE.RULE_VERSION,
        "copiedPrimaryFilesVerified": copied,
    }


def evaluate_conditions(input_folder, primary_input, protocol, original):
    statuses = json.loads((input_folder / "run-status.json").read_text())
    old_statuses = json.loads((primary_input / "run-status.json").read_text())
    original_conditions = [item["id"] for item in protocol["conditions"]]
    conditions = [*original_conditions, "evidence-v2"]
    case_ids = {case["id"] for case in protocol["cases"]}
    if set(statuses) != case_ids or set(old_statuses) != case_ids:
        raise ValueError("Status records must contain exactly the frozen cases")
    old_records = {(item["caseId"], item["condition"]): item for item in original["evaluations"]}
    if len(old_records) != len(original["evaluations"]) or set(old_records) != {
        (case_id, condition) for case_id in case_ids for condition in original_conditions
    }:
        raise ValueError("Preserved primary evaluation records are incomplete or duplicated")
    evaluations = []
    compared = 0
    for case in protocol["cases"]:
        if set(statuses[case["id"]]) != set(conditions):
            raise ValueError("Exploratory run must contain the original three conditions and evidence-v2")
        for condition in conditions:
            status = statuses[case["id"]][condition]
            if condition in original_conditions and status != old_statuses[case["id"]][condition]:
                raise ValueError("Copied primary generation status changed")
            path = input_folder / "reports" / case["id"] / f"{condition}.md"
            result = BASE.evaluate_report(case, condition, path.read_text(), status,
                                          protocol["numericTolerance"], protocol["tieToleranceKWh"])
            if condition in original_conditions:
                if result != old_records[(case["id"], condition)]:
                    raise ValueError(f"Unchanged control scores differ: {case['id']} / {condition}")
                compared += len(result["facts"])
            evaluations.append(result)
    return evaluations, compared


def report_text(result):
    report = BASE.render_report(result)
    title = "# Exploratory report revision: regression on the same known cases"
    intro = (
        "**EXPLORATORY — development evidence after inspecting the primary results.** "
        "Evidence v2 was written in response to the observed report gaps. It uses the same "
        "nine cases and the unchanged primary extractor. This is not a predeclared v2 test, "
        "an independent validation set, a new solar experiment, or a human decision study.\n\n"
        "The original point, table and evidence-v1 reports are copied byte for byte. "
        f"All **{result['preservation']['unchangedControlFactRecords']} original fact records** "
        "were recomputed and matched exactly. Their appearance beside v2 is a preserved "
        "reference comparison; the original primary results remain unchanged.\n\n"
        "The six complete cases still provide 48 fact opportunities per condition. "
        "The two incomplete cases and one direct-renderer stress case remain separate. "
        "Any additional explicit coverage indicates that the revision now states a fact "
        "already available through arithmetic; it does not demonstrate better human decisions.\n\n"
    )
    report = report.replace("# Report information benchmark\n\n", title + "\n\n" + intro, 1)
    report = report.replace("## Complete-case results", "## Reused complete cases: exploratory comparison", 1)
    report = report.replace("![Coverage across complete cases](coverage.png)",
                            "![Exploratory coverage on reused complete cases](coverage.png)\n\n"
                            "Figure: the same six known cases, with preserved controls and an exploratory v2 revision. No independent generalisation is tested.", 1)
    report = report.replace("## Sheffield transfer example\n\n", "## Sheffield transfer example\n\n"
                            "The exploratory input also contains `transfer/sheffield-evidence-v2.md`, a revised presentation of the same previously inspected study. Its original evidence/model and the preserved v1 report remain unchanged. Neither transfer report contributes to benchmark counts.\n\n", 1)
    preservation = result["preservation"]
    report += (
        "\n## Preserved primary comparison\n\n"
        f"Primary source commit: `{preservation['primarySourceCommit']}`. "
        f"Primary input manifest SHA-256: `{preservation['primaryInputManifestSha256']}`. "
        f"Primary results manifest SHA-256: `{preservation['primaryResultsManifestSha256']}`.\n\n"
        f"Unchanged extractor SHA-256: `{preservation['unchangedExtractorSha256']}`. "
        f"Wrapper version: `{WRAPPER_VERSION}`. "
        "The extraction functions, answer keys and numerical tolerances are unchanged. "
        "Only this separate runner supplies the additional condition and exploratory labelling.\n"
    )
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("primary_results", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args(argv)
    root = Path(__file__).resolve().parents[2]
    if subprocess.check_output(["git", "status", "--porcelain"], cwd=root, text=True).strip():
        raise ValueError("Commit source before issuing exploratory evaluation results")
    evaluator_commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    manifest, protocol, original, primary_input, preservation = validate_relationships(
        args.input, args.primary_results, root / "docs/research/assessment-protocol-03.json")
    evaluations, compared = evaluate_conditions(args.input, primary_input, protocol, original)
    preservation["unchangedControlFactRecords"] = compared
    result = {"schema": "sios-report-evaluation-1", "runKind": RUN_KIND,
              "independentValidation": False, "wrapperVersion": WRAPPER_VERSION,
              "ruleVersion": BASE.RULE_VERSION, "sourceCommit": manifest["sourceCommit"],
              "evaluatorCommit": evaluator_commit, "protocolSha256": manifest["protocolSha256"],
              "inputManifestSha256": BASE.digest((args.input / "manifest.json").read_bytes()),
              "inputDirectory": str(args.input.resolve()), "primaryCases": protocol["primaryCases"],
              "questions": protocol["questions"], "preservation": preservation, "evaluations": evaluations,
              "summaries": {
                  "primary": BASE.summarise(evaluations, protocol["primaryCases"]),
                  "incomplete": BASE.summarise(evaluations, protocol["incompleteCases"]),
                  "directRendererStress": BASE.summarise(evaluations, protocol["directRendererStressCases"]),
              }}
    args.output.mkdir(parents=False, exist_ok=False)
    def write_json(name, value):
        (args.output / name).write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")
    write_json("evaluations.json", result)
    with (args.output / "fact-scores.csv").open("w", newline="") as stream:
        fields = ["caseId", "stratum", "condition", "question", "status", "explicitCorrect", "derivableCorrect", "incorrectAssertionCount"]
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for item in evaluations:
            for fact in item["facts"]:
                writer.writerow({**{key: item[key] for key in fields[:3]}, **{key: fact[key] for key in fields[3:]}})
    import matplotlib
    matplotlib.rcParams["svg.hashsalt"] = WRAPPER_VERSION
    matplotlib_version = BASE.plot_coverage(result, args.output)
    svg_path = args.output / "coverage.svg"
    svg_path.write_text(re.sub(r"\s*<dc:date>[^<]*</dc:date>", "", svg_path.read_text()))
    import markdown
    report = report_text(result)
    (args.output / "REPORT.md").write_text(report)
    body = markdown.markdown(report, extensions=["tables"])
    png = base64.b64encode((args.output / "coverage.png").read_bytes()).decode()
    body = body.replace('src="coverage.png"', f'src="data:image/png;base64,{png}"')
    (args.output / "REPORT.html").write_text(
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>Exploratory report revision — same-case regression</title><style>'
        'body{font:17px/1.6 system-ui,sans-serif;max-width:1200px;margin:auto;padding:40px;color:#20323d;background:#f8faf9}'
        'h1,h2{line-height:1.2}h2{margin-top:2em}table{border-collapse:collapse;width:100%;font-size:13px;display:block;overflow:auto}'
        'th,td{border:1px solid #cbd7da;padding:9px;text-align:left}th{background:#e8f1ee}img{width:100%;height:auto}'
        'code{overflow-wrap:anywhere;font-size:.85em}main>p:first-of-type{padding:18px;border-left:5px solid #b27b22;background:#fff2d8}'
        '</style><main>' + body + '</main></html>')
    write_json("runtime.json", {"runKind": RUN_KIND, "wrapperVersion": WRAPPER_VERSION,
                                "wrapperSha256": BASE.digest(Path(__file__).read_bytes()),
                                "ruleVersion": BASE.RULE_VERSION, "unchangedExtractorSha256": preservation["unchangedExtractorSha256"],
                                "python": sys.version, "executable": sys.executable, "platform": platform.platform(),
                                "matplotlib": matplotlib_version, "Markdown": markdown.__version__,
                                "numericTolerance": protocol["numericTolerance"], "tieToleranceKWh": protocol["tieToleranceKWh"],
                                "svgHashSalt": WRAPPER_VERSION, "svgDateRemoved": True})
    output_files = [{"path": path.relative_to(args.output).as_posix(), "sha256": BASE.digest(path.read_bytes()), "bytes": path.stat().st_size}
                    for path in sorted(args.output.rglob("*")) if path.is_file()]
    write_json("manifest.json", {"schema": "sios-report-evaluation-output-1", "runKind": RUN_KIND,
                                 "wrapperVersion": WRAPPER_VERSION, "ruleVersion": BASE.RULE_VERSION,
                                 "sourceCommit": manifest["sourceCommit"], "evaluatorCommit": evaluator_commit,
                                 "protocolSha256": manifest["protocolSha256"], "inputManifestSha256": result["inputManifestSha256"],
                                 "primaryManifestSha256": preservation["primaryInputManifestSha256"],
                                 "primaryResultsManifestSha256": preservation["primaryResultsManifestSha256"],
                                 "unchangedExtractorSha256": preservation["unchangedExtractorSha256"], "files": output_files})
    print(json.dumps({"output": str(args.output.resolve()), "runKind": RUN_KIND,
                      "unchangedControlFactRecords": compared, "completeCases": result["summaries"]["primary"]}))


if __name__ == "__main__":
    main()
