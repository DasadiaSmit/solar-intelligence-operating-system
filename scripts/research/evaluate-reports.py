#!/usr/bin/env python3
"""Independent, closed-template Markdown evaluator for frozen protocol 03.

Only displayed Markdown supplies observations. Frozen literal answer keys supply
the oracle. This is a deterministic functional audit, not a language-model judge
or a human usability experiment. New wording requires an explicit rule revision.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import platform
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

RULE_VERSION = "report-markdown-rules-1.0.0"
PROTOCOL_ID = "report-information-evaluation-03"
STATES = ("explicit-correct", "derivable-correct", "omitted", "incorrect",
          "unavailable-or-withheld", "generation-rejected")
NUMBER = r"[-+]?(?:\d[\d,]*(?:\.\d+)?|∞|Infinity|NaN)"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def numeric(value: str):
    """Do not silently turn a printed invalid numerical claim into missing data."""
    token = re.sub(r"\*|`", "", value).strip().replace(",", "")
    if token.lower() in {"missing", "unavailable", "undefined", "—", "-", ""}:
        return None
    if re.fullmatch(NUMBER.replace("[\\d,]*", "\\d*"), token, re.I):
        try:
            number = float(token.replace("∞", "inf"))
            return number if math.isfinite(number) else {"invalidNumber": token}
        except ValueError:
            return {"invalidNumber": token}
    return {"unparsedNumber": token}


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def equal(actual, expected, tolerance=0.011):
    if isinstance(expected, dict):
        return isinstance(actual, dict) and actual.keys() == expected.keys() and all(
            equal(actual[key], value, tolerance) for key, value in expected.items())
    if isinstance(expected, (list, tuple)):
        return isinstance(actual, (list, tuple)) and len(actual) == len(expected) and all(
            equal(a, e, tolerance) for a, e in zip(actual, expected))
    if isinstance(expected, bool):
        return actual is expected
    if finite(expected):
        return finite(actual) and abs(actual - expected) <= tolerance
    return actual == expected


def tables(markdown):
    result = []
    lines = markdown.splitlines()
    i = 0
    while i + 1 < len(lines):
        if lines[i].strip().startswith("|") and re.fullmatch(r"[\s|:\-]+", lines[i + 1]):
            cells = lambda line: [re.sub(r"\*|`", "", c).strip() for c in line.strip().strip("|").split("|")]
            header = cells(lines[i])
            rows = []
            start = i + 1
            i += 2
            while i < len(lines) and lines[i].strip().startswith("|"):
                row = cells(lines[i])
                if len(row) != len(header):
                    raise ValueError(f"Malformed Markdown table at line {i + 1}")
                rows.append(dict(zip(header, row)))
                i += 1
            result.append({"headers": header, "rows": rows, "line": start})
        else:
            i += 1
    return result


def _ids(value):
    return sorted(set(part.strip().strip("*`") for part in value.split(",") if part.strip().strip("*`")))


def parse_report(markdown, tie_tolerance=1e-6):
    """Return assertions and arithmetic routes without consulting any answer key."""
    body = re.sub(r"^\*\*Arithmetic test fixture[^\n]*\n", "", markdown, flags=re.M)
    clean = body.replace("**", "")
    explicit = {f"Q{i}": [] for i in range(1, 9)}
    derived = {f"Q{i}": [] for i in range(1, 9)}
    withheld = set()
    evidence = []

    def add(bucket, q, value, source):
        bucket[q].append({"value": value, "source": source})

    parsed_tables = tables(body)
    nominal = {}
    regrets = {}
    historical = None
    historical_ids = []
    omissions = None
    sacrifice_table = {}
    expected_counts = set()
    for table in parsed_tables:
        headers, rows = table["headers"], table["rows"]
        source = f"Markdown table at line {table['line']}: {' / '.join(headers)}"
        evidence.append(source)
        if "Option" in headers and "Nominal annual kWh" in headers:
            nominal = {row["Option"]: numeric(row["Nominal annual kWh"]) for row in rows}
            if "Worst historical regret (kWh)" in headers:
                regrets = {row["Option"]: numeric(row["Worst historical regret (kWh)"]) for row in rows}
            if "Historical winner count" in headers:
                for row in rows:
                    match = re.fullmatch(r"\d+\s*/\s*(\d+)", row["Historical winner count"])
                    if match:
                        expected_counts.add(int(match[1]))
            for heading in ("Nominal sacrifice (kWh)", "Nominal yield sacrificed (kWh)"):
                if heading in headers:
                    sacrifice_table = {row["Option"]: numeric(row[heading]) for row in rows}
        if headers and headers[0] == "Historical scenario":
            historical = [{key: numeric(row[key]) for key in headers[1:]} for row in rows]
            historical_ids = [row["Historical scenario"] for row in rows]
        if "Annual kWh" in headers and ("Omission case" in headers or "Selection case" in headers):
            key = "Omission case" if "Omission case" in headers else "Selection case"
            omissions = [numeric(row["Annual kWh"]) for row in rows if row[key].startswith("omit-")]
        if "Robust option" in headers and "Nominal sacrifice (kWh)" in headers:
            sacrifice_table = {row["Robust option"]: numeric(row["Nominal sacrifice (kWh)"]) for row in rows}

    nominal_claims = re.findall(r"Nominal representative-year winner\(s\):\s*([^\n.]+)", clean)
    robust_claims = re.findall(r"Minimax-regret winner\(s\)[^:\n]*:\s*([^\n.]+)", clean)
    named_nominal = [_ids(value) for value in nominal_claims]
    named_robust = [_ids(value) for value in robust_claims]
    for ids in named_nominal:
        value = {"ids": ids}
        looked_up = [nominal.get(key) for key in ids]
        if looked_up and all(finite(v) for v in looked_up) and max(looked_up) - min(looked_up) <= tie_tolerance:
            value["energyKWh"] = looked_up[0]
        elif any(v is not None and not finite(v) for v in looked_up):
            value["energyKWh"] = {"invalidLookup": looked_up}
        add(explicit, "Q1", value, "Nominal winner sentence plus labelled nominal-value lookup")
    for ids in named_robust:
        value = {"ids": ids}
        looked_up = [regrets.get(key) for key in ids]
        if looked_up and all(finite(v) for v in looked_up) and max(looked_up) - min(looked_up) <= tie_tolerance:
            value["regretKWh"] = looked_up[0]
        elif any(v is not None and not finite(v) for v in looked_up):
            value["regretKWh"] = {"invalidLookup": looked_up}
        add(explicit, "Q2", value, "Minimax winner sentence plus labelled candidate-regret lookup")

    nominal_ok = bool(nominal) and all(finite(v) for v in nominal.values())
    max_nominal = max(nominal.values()) if nominal_ok else None
    nominal_ids = sorted(key for key, value in nominal.items() if max_nominal - value <= tie_tolerance) if nominal_ok else []
    if nominal_ok:
        add(derived, "Q1", {"ids": nominal_ids, "energyKWh": max_nominal}, "Maximum and all ties from displayed nominal table")

    class_ok = bool(re.search(r"(?:sensitivity range, not a confidence interval|describe sensitivity, not a confidence interval|sensitivity, not (?:a )?(?:confidence interval|probability))", clean, re.I))
    for match in re.finditer(rf"(?:representative estimate across|[Ss]ensitivity range(?:\s*\(kWh\))?\s*:)\s*({NUMBER})\s*[–—]\s*({NUMBER})\s*kWh", clean):
        add(explicit, "Q3", {"rangeKWh": [numeric(match[1]), numeric(match[2])], "classification": "sensitivity" if class_ok else "unspecified"}, match[0])
    if re.search(r"(?:Sensitivity range|Omission sensitivity)[^\n]*(?:unavailable|withheld)", clean, re.I):
        withheld.add("Q3")
    if omissions is not None:
        if len(omissions) == 4 and all(finite(v) for v in omissions):
            add(derived, "Q3", {"rangeKWh": [min(omissions), max(omissions)], "classification": "sensitivity" if class_ok else "unspecified"}, "Minimum/maximum of four displayed omission rows plus scope wording")
        else:
            withheld.add("Q3")
    # A probability reinterpretation is a contradictory assertion, even if a
    # correct sensitivity sentence also appears elsewhere.
    if re.search(r"(?:This|The|Omission|Sensitivity)[^.!\n]*(?:is|represents|provides)\s+(?:a\s+)?(?:\d+%\s+)?(?:confidence interval|future probability)", clean, re.I):
        add(explicit, "Q3", {"classification": "probability"}, "Positive probability/confidence-interval assertion")

    for match in re.finditer(r"There are\s+(\d+)\s+option pairs whose relative order reverses", clean):
        add(explicit, "Q4", {"count": int(match[1])}, match[0])
    for match in re.finditer(rf"reduces worst-case regret by\s*({NUMBER})\s*[–—]\s*({NUMBER})\s*kWh", clean):
        add(explicit, "Q5", {"rangeKWh": [numeric(match[1]), numeric(match[2])]}, match[0])
    if "The robust rule does not reduce worst-case regret for the nominal choice in this tested set." in clean:
        add(explicit, "Q5", {"rangeKWh": [0, 0]}, "Explicit zero-benefit sentence")

    matrix_complete = historical is not None and len(historical) == 4 and nominal_ok and all(
        set(row) == set(nominal) and all(finite(v) for v in row.values()) for row in historical)
    raw_regrets = None
    if matrix_complete:
        # Independent scalar arithmetic; no production comparator is imported.
        raw_regrets = {key: max(max(row.values()) - row[key] for row in historical) for key in nominal}
        keys = sorted(nominal)
        reversals = sum(any(row[a] - row[b] > tie_tolerance for row in historical) and
                        any(row[b] - row[a] > tie_tolerance for row in historical)
                        for i, a in enumerate(keys) for b in keys[i + 1:])
        add(derived, "Q4", {"count": reversals}, "Pairwise sign changes in the displayed four-scenario matrix")
    elif historical is not None:
        withheld.update(("Q2", "Q4", "Q5", "Q6"))

    regret_routes = []
    if raw_regrets is not None:
        regret_routes.append((raw_regrets, "Displayed historical matrix"))
    if regrets and set(regrets) == set(nominal) and all(finite(v) for v in regrets.values()):
        regret_routes.append((regrets, "Displayed candidate-regret table"))
    robust_routes = []
    for route, source in regret_routes:
        best = min(route.values())
        ids = sorted(key for key, value in route.items() if value - best <= tie_tolerance)
        add(derived, "Q2", {"ids": ids, "regretKWh": best}, f"Minimum and all ties from {source.lower()}")
        robust_routes.append((ids, source))
        if nominal_ok:
            gains = [route[key] - best for key in nominal_ids]
            add(derived, "Q5", {"rangeKWh": [min(gains), max(gains)]}, f"Regret differences over all nominal ties from {source.lower()}")
    robust_routes += [(ids, "Explicit robust winner sentence") for ids in named_robust]
    for ids, source in robust_routes:
        if nominal_ok and ids and all(key in nominal for key in ids):
            add(derived, "Q6", {"byId": {key: max_nominal - nominal[key] for key in ids}}, f"Maximum nominal yield minus every selected yield; {source.lower()}")
    if sacrifice_table:
        for ids in named_robust:
            add(explicit, "Q6", {"byId": {key: sacrifice_table[key] for key in ids if key in sacrifice_table}}, "Labelled sacrifice-table entries for named robust winners")
    # Optional later renderer convention. This does not run or change it.
    sacrifices = re.findall(rf"Nominal yield sacrificed by\s+([A-Za-z0-9_-]+):\s*({NUMBER})\s*kWh", clean)
    if sacrifices:
        add(explicit, "Q6", {"byId": {key: numeric(value) for key, value in sacrifices}}, "Explicit per-winner sacrifice sentences")

    count_matches = list(re.finditer(r"Available historical scenarios:\s*(\d+)\s*/\s*(\d+)\s*\.\s*Missing historical cells:\s*(\d+)", clean))
    for match in count_matches:
        value = {"available": int(match[1]), "expected": int(match[2]), "missingCells": int(match[3])}
        location_match = re.search(r"Missing locations:\s*([^\n.]+)", clean)
        if location_match:
            value["missingLocations"] = sorted(part.strip() for part in location_match[1].split(","))
        add(explicit, "Q7", value, match[0] + (location_match[0] if location_match else ""))
    if not count_matches and "across the four source years" in clean and expected_counts == {4}:
        add(explicit, "Q7", {"available": 4, "expected": 4}, "Named four source years and /4 historical winner-count denominators")
    if historical is not None:
        value = {"available": len(historical), "missingCells": sum(v is None for row in historical for v in row.values())}
        if re.search(r"four (?:source years|scenarios|tested historical scenarios)", clean) or count_matches:
            value["expected"] = int(count_matches[0][2]) if count_matches else 4
        locations = sorted(f"{historical_ids[i]} / {key}" for i, row in enumerate(historical) for key, v in row.items() if v is None)
        if locations:
            value["missingLocations"] = locations
        add(derived, "Q7", value, "Displayed matrix row/cell counts and missing locations; expected count only from report wording")

    scope_sentence = "Scope: finite tested scenarios and modelled/synthetic evidence. No measured production, future probability or human decision-quality improvement is established."
    if scope_sentence in clean:
        add(explicit, "Q8", {"finiteModelledScope": True, "noMeasuredClaim": True,
                             "noFutureProbabilityClaim": True, "noHumanImprovementClaim": True}, "Common explicit scope paragraph")
    elif all(phrase in clean for phrase in ("retrospective computational study", "No measured plant output", "calibrated future probability", "human decision-quality benefit has not been established")):
        add(explicit, "Q8", {"finiteModelledScope": True, "noMeasuredClaim": True,
                             "noFutureProbabilityClaim": True, "noHumanImprovementClaim": True}, "Existing renderer's retrospective/scope/benefit limitations")
    # Closed-template contradiction audit; output retained for manual review.
    for sentence in re.split(r"(?<=[.!?])\s+|\n", clean):
        if re.search(r"\b(?:no|not|without|unestablished|neither|cannot|doesn't|hasn't)\b", sentence, re.I):
            continue
        contradictory = {}
        if re.search(r"(?:proves?|establishes?|demonstrates?)\s+(?:improved|better|an improvement in)\s+human|(?:improves?|improved)\s+human decision", sentence, re.I):
            contradictory["noHumanImprovementClaim"] = False
        if re.search(r"(?:is|are|represents?|provides?)\s+(?:a\s+)?(?:calibrated\s+)?future probabilit", sentence, re.I):
            contradictory["noFutureProbabilityClaim"] = False
        if re.search(r"(?:results?|values?|data|output)\s+(?:is|are)\s+(?:actual\s+)?measured (?:plant|production|output)", sentence, re.I):
            contradictory["noMeasuredClaim"] = False
        if contradictory:
            add(explicit, "Q8", contradictory, sentence.strip())
    return {"explicit": explicit, "derived": derived, "withheld": sorted(withheld),
            "tableEvidence": evidence, "nonFiniteTokens": re.findall(r"(?<!\w)(?:[-+]?∞|[-+]?Infinity|NaN)(?!\w)", clean),
            "wordCount": len(re.findall(r"\S+", markdown))}


def answer_key(case):
    """Read the frozen literal oracle, not a production or renderer calculation."""
    key = case["expected"]
    worst = key["worstRegretById"]
    # Q2's scalar is a lookup for a literal oracle winner, not recomputation
    # from fixture energy. Null markers are counted solely for Q7 completeness.
    robust_regret = worst[key["robustWinnerIds"][0]] if worst is not None else None
    missing = sum(v is None for row in case["historicalCases"] for v in row["annualKWh"])
    missing_locations = sorted(f"{row['id']} / {case['candidateIds'][i]}" for row in case["historicalCases"] for i, v in enumerate(row["annualKWh"]) if v is None)
    return {
        "Q1": {"ids": sorted(key["nominalWinnerIds"]), "energyKWh": key["nominalMaximumKWh"]},
        "Q2": {"ids": sorted(key["robustWinnerIds"]), "regretKWh": robust_regret} if worst is not None else None,
        "Q3": {"rangeKWh": key["sensitivityRangeKWh"], "classification": "sensitivity"} if key["sensitivityRangeKWh"] is not None else None,
        "Q4": {"count": key["reversalCount"]} if key["reversalCount"] is not None else None,
        "Q5": {"rangeKWh": key["regretReductionKWh"]} if key["regretReductionKWh"] is not None else None,
        "Q6": {"byId": key["nominalSacrificeById"]} if key["nominalSacrificeById"] is not None else None,
        "Q7": {"available": key["availableScenarioCount"], "expected": key["expectedScenarioCount"], **({"missingCells": missing, "missingLocations": missing_locations} if missing else {})},
        "Q8": {"finiteModelledScope": True, "noMeasuredClaim": True, "noFutureProbabilityClaim": True, "noHumanImprovementClaim": True},
    }


def compatible_assertion(value, expected, q, tolerance):
    """Partial correct assertions are not complete answers, but can be audited."""
    if expected is None:
        return False
    for field, actual in value.items():
        if field == "missingCells" and q == "Q7" and field not in expected:
            if actual != 0:
                return False
        elif q == "Q6" and field == "byId" and isinstance(actual, dict):
            if any(key not in expected[field] or not equal(number, expected[field][key], tolerance) for key, number in actual.items()):
                return False
        elif field not in expected or not equal(actual, expected[field], tolerance):
            return False
    return True


def complete_answer(value, expected, q, tolerance):
    if expected is None or not compatible_assertion(value, expected, q, tolerance) or not all(field in value for field in expected):
        return False
    return q != "Q6" or value["byId"].keys() == expected["byId"].keys()


def evaluate_report(case, condition, markdown, run_status, tolerance=0.011, tie_tolerance=1e-6):
    keys = answer_key(case)
    if run_status["status"] == "generation-rejected":
        return {"caseId": case["id"], "title": case["title"], "stratum": case["stratum"], "condition": condition,
                "generationStatus": "generation-rejected", "error": run_status.get("error"), "wordCount": 0,
                "nonFiniteTokens": [], "facts": [{"question": q, "status": "generation-rejected", "expected": key,
                    "explicit": [], "derived": [], "explicitCorrect": False, "derivableCorrect": False,
                    "incorrectAssertionCount": 0, "reason": "Producer rejected input; no generated report was assessed."}
                    for q, key in keys.items()]}
    if run_status["status"] != "generated":
        raise ValueError(f"Unknown report status {run_status['status']!r}")
    observed = parse_report(markdown, tie_tolerance)
    facts = []
    for q, expected in keys.items():
        direct, derived = observed["explicit"][q], observed["derived"][q]
        bad = [item for item in direct if not compatible_assertion(item["value"], expected, q, tolerance)]
        direct_ok = any(complete_answer(item["value"], expected, q, tolerance) for item in direct)
        derived_ok = any(complete_answer(item["value"], expected, q, tolerance) for item in derived)
        if bad:
            status, reason = "incorrect", "An explicit assertion contradicts the frozen answer or prints an invalid/unsupported value; derivation cannot rescue it."
        elif direct_ok:
            status, reason = "explicit-correct", "A named answer plus labelled lookups supplies every required component."
        elif derived_ok:
            status, reason = "derivable-correct", "The complete answer can be computed from displayed evidence under the frozen arithmetic rules."
        elif q in observed["withheld"] or derived:
            status, reason = "unavailable-or-withheld", "Displayed evidence is incomplete, withheld, or gives only a failed/conflicting derivation."
        else:
            status, reason = "omitted", "The displayed report supplies no complete answer; absence is not a false assertion."
        facts.append({"question": q, "status": status, "expected": expected,
                      "explicit": direct, "derived": derived, "explicitCorrect": direct_ok and not bad,
                      "derivableCorrect": derived_ok, "incorrectAssertionCount": len(bad), "reason": reason})
    return {"caseId": case["id"], "title": case["title"], "stratum": case["stratum"], "condition": condition,
            "generationStatus": "generated", "wordCount": observed["wordCount"],
            "nonFiniteTokens": observed["nonFiniteTokens"], "facts": facts}


def validate_input(folder, protocol_path):
    manifest = json.loads((folder / "manifest.json").read_text())
    if manifest.get("schema") != "sios-report-benchmark-1":
        raise ValueError("Unexpected input manifest schema")
    files = manifest.get("files", [])
    listed = set()
    for item in files:
        rel = Path(item["path"])
        if rel.is_absolute() or ".." in rel.parts or item["path"] in listed:
            raise ValueError("Unsafe or duplicate manifest path")
        path = folder / rel
        if path.is_symlink() or not path.resolve().is_relative_to(folder.resolve()):
            raise ValueError("Manifest path escapes input directory")
        data = path.read_bytes()
        if digest(data) != item["sha256"] or len(data) != item["bytes"]:
            raise ValueError(f"Input integrity failure: {rel}")
        listed.add(item["path"])
    actual = {path.relative_to(folder).as_posix() for path in folder.rglob("*") if path.is_file() and path != folder / "manifest.json"}
    if actual != listed:
        raise ValueError("Manifest must cover exactly every non-manifest input file")
    protocol_bytes = (folder / "protocol.json").read_bytes()
    if digest(protocol_bytes) != manifest["protocolSha256"] or protocol_bytes != protocol_path.read_bytes():
        raise ValueError("Input protocol does not match the checked-in frozen protocol")
    protocol = json.loads(protocol_bytes)
    if protocol["id"] != PROTOCOL_ID or json.loads((folder / "cases.json").read_text()) != protocol["cases"]:
        raise ValueError("Input case definitions differ from frozen protocol")
    return manifest, protocol


def summarise(evaluations, case_ids):
    summary = {}
    for condition in sorted({item["condition"] for item in evaluations}):
        selected = [item for item in evaluations if item["condition"] == condition and item["caseId"] in case_ids]
        facts = [fact for item in selected for fact in item["facts"]]
        counts = Counter(fact["status"] for fact in facts)
        summary[condition] = {"cases": len(selected), "opportunities": len(facts),
                              "counts": {status: counts[status] for status in STATES},
                              "derivableCorrectIncludingConflicted": sum(fact["derivableCorrect"] for fact in facts),
                              "incorrectAssertions": sum(fact["incorrectAssertionCount"] for fact in facts),
                              "generationRejections": sum(item["generationStatus"] == "generation-rejected" for item in selected),
                              "byQuestion": {q: dict(Counter(fact["status"] for fact in facts if fact["question"] == q)) for q in [f"Q{i}" for i in range(1, 9)]}}
    return summary


def render_report(result):
    primary = result["summaries"]["primary"]
    lines = ["# Report information benchmark", "", "This is a known-answer functional test of the information in generated reports. It does not measure how quickly people read them, whether they make better decisions, or whether the solar model is physically accurate.", "",
             f"Frozen protocol: `{PROTOCOL_ID}`. Extraction rules: `{RULE_VERSION}`. Six complete arithmetic cases × eight questions = **48 fact opportunities per condition**. Incomplete and conflicting-input cases are kept outside that denominator.", "",
             "## Complete-case results", "", "| Condition | Explicit correct | Additional derivable correct | Omitted | Incorrect | Unavailable / withheld | Generation rejected |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for condition, summary in primary.items():
        counts = summary["counts"]
        lines.append(f"| {condition} | " + " | ".join(str(counts[state]) for state in STATES) + " |")
    lines += ["", "Explicit answers include a named winner and direct lookup of its value in a labelled candidate table. Ranking, subtraction and minima/maxima count as derivation. ‘Additional derivable’ excludes facts already explicit. An incorrect explicit assertion stays incorrect even if another displayed route gives the right answer. Missing answers are not scored as false claims.", "",
              "![Coverage across complete cases](coverage.png)", "", "## Question-level results", "", "Each cell shows explicit / additional derivable / incorrect counts out of six; other states are retained in the machine-readable results.", "",
              "| Question | " + " | ".join(primary) + " |", "| --- | " + " | ".join("---" for _ in primary) + " |"]
    for question in result["questions"]:
        q = question["id"]
        cells = []
        for summary in primary.values():
            c = summary["byQuestion"][q]
            cells.append(" / ".join(str(c.get(state, 0)) for state in ("explicit-correct", "derivable-correct", "incorrect")))
        lines.append(f"| {q}: {question['fact']} | " + " | ".join(cells) + " |")
    lines += ["", "## Incomplete evidence and direct renderer stress", "", "| Case | Condition | Outcome by question | Printed non-finite tokens |", "| --- | --- | --- | --- |"]
    for item in result["evaluations"]:
        if item["caseId"] not in result["primaryCases"]:
            outcome = "; ".join(f"{fact['question']} {fact['status']}" for fact in item["facts"])
            lines.append(f"| {item['caseId']} — {item['title']} | {item['condition']} | {outcome} | {', '.join(item['nonFiniteTokens']) or 'None'} |")
            if item.get("error"):
                lines.append(f"\nProducer rejection for {item['caseId']} / {item['condition']}: `{item['error'].replace('`', '')}`. This is an operational refusal, not an emitted false recommendation.\n")
    lines += ["", "The complete-study renderer normally receives validated producer output. Missing inputs and a deliberately stale cached choice probe that contract; they are not estimates of ordinary deployment error frequency. A safe refusal can avoid a false claim while still leaving the user without a report.", "",
              "## Sheffield transfer example", "", "The input bundle preserves the previously inspected Sheffield report byte for byte. It is a transfer example, not a new independent replication, and receives no synthetic benchmark percentage. Its text is retained at `transfer/sheffield-evidence-v1.md` in the input bundle.", "",
              "## Interpretation limits", "", "‘Equal-information’ refers to the same underlying inputs and question-answerability, not identical displayed fields. The table control displays the full historical matrix; the current evidence report displays derived candidate regrets and reversal summaries without every historical cell. Both can retain the arithmetic information needed for the questions. Differences in explicit coverage show which facts the report states for the reader; they do not establish a human performance advantage. The cases and parsers were designed with knowledge of the existing renderer. This small, deliberately diagnostic set supports functional checks, not statistical generalisation.", "",
              "The evaluator reads actual Markdown. It imports no production calculation and does not read hidden audit assertions. The oracle uses frozen literal expected answers; Q2's scalar is a lookup in that literal key, and Q7's missing-cell requirement is a count of null markers in the frozen fixture. A closed-template parser is not a general natural-language truth checker. All extracted assertions and arithmetic routes remain reviewable in `evaluations.json`.", "",
              "A report's word count is descriptive only. No usability score, weighted utility score, significance test or time-saving claim is made. Any later version run against these known cases must be labelled exploratory regression evidence.", "",
              "## Provenance and reproduction", "", f"Input source commit: `{result['sourceCommit']}`. Evaluator commit: `{result['evaluatorCommit']}`. Protocol SHA-256: `{result['protocolSha256']}`. Input manifest SHA-256: `{result['inputManifestSha256']}`.", "",
              "`fact-scores.csv` contains one row per case, condition and question. `evaluations.json` contains the expected keys, exact extracted values, source descriptions and derivation routes. `manifest.json` hashes every output. `runtime.json` records interpreter and plotting versions.", ""]
    return "\n".join(lines)


def plot_coverage(result, output):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    conditions = list(result["summaries"]["primary"])
    colors = ["#16716c", "#91c4b8", "#d9dee4", "#bf4c50", "#e5b65b", "#6f5d8e"]
    fig, ax = plt.subplots(figsize=(10, 4.5), constrained_layout=True)
    left = [0] * len(conditions)
    for state, color in zip(STATES, colors):
        values = [result["summaries"]["primary"][c]["counts"][state] for c in conditions]
        bars = ax.barh(conditions, values, left=left, color=color, label=state, height=0.58)
        for bar, value in zip(bars, values):
            if value:
                ax.text(bar.get_x() + value / 2, bar.get_y() + bar.get_height() / 2, str(value), ha="center", va="center", fontsize=10)
        left = [a + b for a, b in zip(left, values)]
    ax.set_xlim(0, 48)
    ax.set_xticks(range(0, 49, 8))
    ax.set_xlabel("Facts across six complete cases (48 per condition)")
    ax.set_title("Displayed report information: explicitness and derivability", loc="left", pad=15)
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.grid(axis="x", alpha=0.15)
    ax.set_axisbelow(True)
    ax.invert_yaxis()
    ax.legend(ncol=3, loc="upper center", bbox_to_anchor=(0.5, -0.18), frameon=False, fontsize=9)
    fig.savefig(output / "coverage.png", dpi=180)
    fig.savefig(output / "coverage.svg")
    plt.close(fig)
    return matplotlib.__version__


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args(argv)
    root = Path(__file__).resolve().parents[2]
    manifest, protocol = validate_input(args.input, root / "docs/research/assessment-protocol-03.json")
    evaluator_commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    if subprocess.check_output(["git", "status", "--porcelain"], cwd=root, text=True).strip():
        raise ValueError("Commit source before issuing benchmark evaluation results")
    statuses = json.loads((args.input / "run-status.json").read_text())
    metadata = json.loads((args.input / "source-metadata.json").read_text())
    if metadata["sourceCommit"] != manifest["sourceCommit"] or metadata["protocolSha256"] != manifest["protocolSha256"]:
        raise ValueError("Source metadata and manifest identities disagree")
    evaluations = []
    condition_ids = [condition["id"] for condition in protocol["conditions"]]
    for case in protocol["cases"]:
        if set(statuses[case["id"]]) != set(condition_ids):
            raise ValueError("Primary run must contain exactly the three frozen conditions; exploratory runs need an explicit separate runner/rule version")
        for condition in condition_ids:
            path = args.input / "reports" / case["id"] / f"{condition}.md"
            evaluations.append(evaluate_report(case, condition, path.read_text(), statuses[case["id"]][condition], protocol["numericTolerance"], protocol["tieToleranceKWh"]))
    result = {"schema": "sios-report-evaluation-1", "ruleVersion": RULE_VERSION, "sourceCommit": manifest["sourceCommit"],
              "evaluatorCommit": evaluator_commit, "protocolSha256": manifest["protocolSha256"],
              "inputManifestSha256": digest((args.input / "manifest.json").read_bytes()),
              "inputDirectory": str(args.input.resolve()), "primaryCases": protocol["primaryCases"], "questions": protocol["questions"],
              "evaluations": evaluations, "summaries": {
                  "primary": summarise(evaluations, protocol["primaryCases"]),
                  "incomplete": summarise(evaluations, protocol["incompleteCases"]),
                  "directRendererStress": summarise(evaluations, protocol["directRendererStressCases"]),
              }}
    args.output.mkdir(parents=False, exist_ok=False)
    write_json = lambda name, value: (args.output / name).write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")
    write_json("evaluations.json", result)
    with (args.output / "fact-scores.csv").open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=["caseId", "stratum", "condition", "question", "status", "explicitCorrect", "derivableCorrect", "incorrectAssertionCount"])
        writer.writeheader()
        for item in evaluations:
            for fact in item["facts"]:
                writer.writerow({**{key: item[key] for key in ("caseId", "stratum", "condition")}, **{key: fact[key] for key in writer.fieldnames[3:]}})
    matplotlib_version = plot_coverage(result, args.output)
    import markdown as markdown_library
    report = render_report(result)
    (args.output / "REPORT.md").write_text(report)
    body = markdown_library.markdown(report, extensions=["tables"])
    import base64
    image = base64.b64encode((args.output / "coverage.png").read_bytes()).decode()
    body = body.replace('src="coverage.png"', f'src="data:image/png;base64,{image}"')
    (args.output / "REPORT.html").write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Report information benchmark</title><style>body{font:17px/1.6 system-ui,sans-serif;max-width:1200px;margin:auto;padding:40px;color:#20323d;background:#f8faf9}h1,h2{line-height:1.2}h2{margin-top:2em}table{border-collapse:collapse;width:100%;font-size:13px;display:block;overflow:auto}th,td{border:1px solid #cbd7da;padding:9px;text-align:left}th{background:#e8f1ee}img{width:100%;height:auto}code{overflow-wrap:anywhere;font-size:.85em}</style><main>' + body + '</main></html>')
    write_json("runtime.json", {"ruleVersion": RULE_VERSION, "python": sys.version, "executable": sys.executable,
                                "platform": platform.platform(), "matplotlib": matplotlib_version, "Markdown": markdown_library.__version__,
                                "numericTolerance": protocol["numericTolerance"], "tieToleranceKWh": protocol["tieToleranceKWh"],
                                "evaluatorSha256": digest(Path(__file__).read_bytes())})
    output_files = [{"path": path.relative_to(args.output).as_posix(), "sha256": digest(path.read_bytes()), "bytes": path.stat().st_size}
                    for path in sorted(args.output.rglob("*")) if path.is_file()]
    write_json("manifest.json", {"schema": "sios-report-evaluation-output-1", "ruleVersion": RULE_VERSION,
                                 "sourceCommit": manifest["sourceCommit"], "evaluatorCommit": evaluator_commit,
                                 "protocolSha256": manifest["protocolSha256"], "inputManifestSha256": result["inputManifestSha256"], "files": output_files})
    print(json.dumps({"output": str(args.output.resolve()), "primary": result["summaries"]["primary"]}))


if __name__ == "__main__":
    main()
