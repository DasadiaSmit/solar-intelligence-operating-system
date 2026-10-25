"""Synthetic extractor tests; these do not execute the benchmark renderer."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("report_evaluation", ROOT / "scripts/research/evaluate-reports.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

SCOPE = "Scope: finite tested scenarios and modelled/synthetic evidence. No measured production, future probability or human decision-quality improvement is established."
NOMINAL = """| Option | Nominal annual kWh |
| --- | ---: |
| X | 12 |
| Y | 8 |
"""
HISTORY = """| Historical scenario | X | Y |
| --- | ---: | ---: |
| h1 | 12 | 11 |
| h2 | 1 | 8 |
| h3 | 12 | 11 |
| h4 | 1 | 8 |
"""
OMISSIONS = """Omission results describe sensitivity, not a confidence interval.
| Omission case | Annual kWh |
| --- | ---: |
| omit-a | 10 |
| omit-b | 11 |
| omit-c | 13 |
| omit-d | 14 |
"""
COUNT = "Available historical scenarios: **4 / 4**. Missing historical cells: **0**."
CANDIDATES = """| Option | Nominal annual kWh | Worst historical regret (kWh) | Historical winner count |
| --- | ---: | ---: | ---: |
| X | 12 | 7 | 2 / 4 |
| Y | 8 | 1 | 2 / 4 |
"""


def fixture():
    return {"id": "T1", "title": "Independent synthetic parser fixture", "stratum": "complete",
            "candidateIds": ["X", "Y"], "historicalCases": [
                {"id": "h1", "annualKWh": [12, 11]}, {"id": "h2", "annualKWh": [1, 8]},
                {"id": "h3", "annualKWh": [12, 11]}, {"id": "h4", "annualKWh": [1, 8]}],
            "expected": {"nominalWinnerIds": ["X"], "nominalMaximumKWh": 12,
                         "robustWinnerIds": ["Y"], "worstRegretById": {"X": 7, "Y": 1},
                         "reversalCount": 1, "regretReductionKWh": [6, 6],
                         "nominalSacrificeById": {"Y": 4}, "sensitivityRangeKWh": [10, 14],
                         "expectedScenarioCount": 4, "availableScenarioCount": 4}}


def evaluate(text, case=None, status=None):
    return MODULE.evaluate_report(case or fixture(), "test", text, status or {"status": "generated"})


def facts(result):
    return {fact["question"]: fact for fact in result["facts"]}


def raw_report():
    return "\n\n".join([SCOPE, COUNT, NOMINAL, HISTORY, OMISSIONS,
                            "The decision rule is minimum worst-case energy regret over the four scenarios."])


def narrative():
    return "\n\n".join([SCOPE, "Nominal representative-year winner(s): **X**.",
        "Minimax-regret winner(s) across the four source years: **Y**.",
        "Within the four tested historical scenarios, switching rules reduces worst-case regret by 6–6 kWh.",
        "There are **1** option pairs whose relative order reverses between source years.",
        "Removing one source year at a time changes the representative estimate across **10–14 kWh**. This is a sensitivity range, not a confidence interval.",
        CANDIDATES])


class ReportEvaluationTests(unittest.TestCase):
    def test_raw_tables_supply_all_eight_answers_without_narrative(self):
        scored = facts(evaluate(raw_report()))
        for q in ("Q1", "Q2", "Q3", "Q4", "Q5", "Q6"):
            self.assertEqual(scored[q]["status"], "derivable-correct", q)
        self.assertEqual(scored["Q7"]["status"], "explicit-correct")
        self.assertEqual(scored["Q8"]["status"], "explicit-correct")
        self.assertEqual(scored["Q5"]["derived"][0]["value"], {"rangeKWh": [6, 6]})
        self.assertEqual(scored["Q6"]["derived"][0]["value"], {"byId": {"Y": 4}})

    def test_narrative_values_are_direct_but_sacrifice_requires_subtraction(self):
        scored = facts(evaluate(narrative()))
        for q in ("Q1", "Q2", "Q3", "Q4", "Q5", "Q7", "Q8"):
            self.assertEqual(scored[q]["status"], "explicit-correct", q)
        self.assertEqual(scored["Q6"]["status"], "derivable-correct")

    def test_misleading_nominal_claim_is_not_rescued_by_correct_raw_table(self):
        scored = facts(evaluate("Nominal representative-year winner(s): **Y**.\n" + raw_report()))
        self.assertEqual(scored["Q1"]["status"], "incorrect")
        self.assertTrue(scored["Q1"]["derivableCorrect"])
        self.assertFalse(scored["Q1"]["explicitCorrect"])

    def test_wrong_regret_scalar_is_an_incorrect_assertion(self):
        scored = facts(evaluate(narrative().replace("| Y | 8 | 1 |", "| Y | 8 | 2 |")))
        self.assertEqual(scored["Q2"]["status"], "incorrect")

    def test_stale_robust_claim_is_not_rescued_by_correct_candidate_regrets(self):
        scored = facts(evaluate(narrative().replace("years: **Y**", "years: **X**")))
        self.assertEqual(scored["Q2"]["status"], "incorrect")
        self.assertTrue(scored["Q2"]["derivableCorrect"])

    def test_omission_is_not_an_incorrect_assertion(self):
        scored = facts(evaluate(SCOPE + "\n" + NOMINAL))
        self.assertEqual(scored["Q2"]["status"], "omitted")
        self.assertEqual(scored["Q3"]["status"], "omitted")
        self.assertEqual(scored["Q5"]["incorrectAssertionCount"], 0)

    def test_all_ties_must_be_present(self):
        case = fixture()
        case["expected"]["nominalWinnerIds"] = ["X", "Y"]
        case["expected"]["nominalMaximumKWh"] = 12
        table = NOMINAL.replace("| Y | 8 |", "| Y | 12 |")
        scored = facts(evaluate("Nominal representative-year winner(s): **X**.\n" + table, case))
        self.assertEqual(scored["Q1"]["status"], "incorrect")
        self.assertTrue(scored["Q1"]["derivableCorrect"])
        complete = facts(evaluate("Nominal representative-year winner(s): **Y, X**.\n" + table, case))
        self.assertEqual(complete["Q1"]["status"], "explicit-correct")

    def test_all_robust_sacrifices_required(self):
        case = fixture()
        case["expected"].update(robustWinnerIds=["X", "Y"], worstRegretById={"X": 1, "Y": 1}, nominalSacrificeById={"X": 0, "Y": 4})
        text = narrative().replace("years: **Y**", "years: **X, Y**").replace("| X | 12 | 7 |", "| X | 12 | 1 |")
        text += "\n| Robust option | Nominal sacrifice (kWh) |\n| --- | ---: |\n| X | 0 |\n"
        scored = facts(evaluate(text, case))
        self.assertEqual(scored["Q6"]["status"], "derivable-correct")
        self.assertFalse(scored["Q6"]["explicitCorrect"])
        self.assertEqual(scored["Q6"]["incorrectAssertionCount"], 0)
        self.assertTrue(scored["Q6"]["derivableCorrect"])
        scored = facts(evaluate(text + "| Y | 4 |\n", case))
        self.assertEqual(scored["Q6"]["status"], "explicit-correct")

    def test_range_over_all_nominal_ties(self):
        case = fixture()
        case["expected"].update(nominalWinnerIds=["X", "Y"], nominalSacrificeById={"Y": 0}, regretReductionKWh=[0, 6])
        text = raw_report().replace("| Y | 8 |", "| Y | 12 |")
        scored = facts(evaluate(text, case))
        self.assertEqual(scored["Q5"]["status"], "derivable-correct")
        self.assertEqual(scored["Q5"]["derived"][0]["value"], {"rangeKWh": [0, 6]})

    def test_producer_rejection_is_not_false_claim(self):
        result = evaluate("irrelevant status stub", status={"status": "generation-rejected", "error": "incomplete energy"})
        self.assertTrue(all(item["status"] == "generation-rejected" for item in result["facts"]))
        self.assertTrue(all(item["incorrectAssertionCount"] == 0 for item in result["facts"]))

    def test_infinity_and_nan_are_invalid_assertions(self):
        case = fixture()
        case["expected"]["sensitivityRangeKWh"] = None
        for low, high in (("∞", "-∞"), ("NaN", "NaN"), ("Infinity", "-Infinity")):
            text = f"Removing one source year at a time changes the representative estimate across **{low}–{high} kWh**. This is a sensitivity range, not a confidence interval."
            result = evaluate(text, case)
            self.assertEqual(facts(result)["Q3"]["status"], "incorrect")
            self.assertTrue(result["nonFiniteTokens"])
            json.dumps(result, allow_nan=False)

    def test_missing_omissions_can_be_safely_withheld(self):
        case = fixture()
        case["expected"]["sensitivityRangeKWh"] = None
        scored = facts(evaluate("Sensitivity range unavailable: four omission results were not supplied.", case))
        self.assertEqual(scored["Q3"]["status"], "unavailable-or-withheld")
        self.assertEqual(scored["Q3"]["incorrectAssertionCount"], 0)

    def test_missing_cell_requires_location_and_blocks_derivation(self):
        case = fixture()
        case["historicalCases"][1]["annualKWh"][1] = None
        for key in ("robustWinnerIds", "worstRegretById", "reversalCount", "regretReductionKWh", "nominalSacrificeById"):
            case["expected"][key] = None
        text = raw_report().replace("| h2 | 1 | 8 |", "| h2 | 1 | missing |").replace("cells: **0**.", "cells: **1**. Missing locations: h2 / Y.")
        scored = facts(evaluate(text, case))
        self.assertEqual(scored["Q7"]["status"], "explicit-correct")
        for q in ("Q2", "Q4", "Q5", "Q6"):
            self.assertEqual(scored[q]["status"], "unavailable-or-withheld", q)
        count_only = text.split("\n\n")[1].replace(" Missing locations: h2 / Y.", "")
        self.assertEqual(facts(evaluate(count_only, case))["Q7"]["status"], "omitted")

    def test_scope_disclaimer_does_not_rescue_positive_human_claim(self):
        text = SCOPE + "\nThis report improves human decision quality."
        self.assertEqual(facts(evaluate(text))["Q8"]["status"], "incorrect")
        self.assertEqual(facts(evaluate(SCOPE))["Q8"]["status"], "explicit-correct")

    def test_confidence_claim_does_not_rescue_correct_sensitivity_range(self):
        text = narrative() + "\nThis range is a 95% confidence interval."
        self.assertEqual(facts(evaluate(text))["Q3"]["status"], "incorrect")

    def test_fixture_title_cannot_supply_an_answer(self):
        text = "**Arithmetic test fixture T1: The robust rule does not reduce worst-case regret for the nominal choice in this tested set.**\n"
        self.assertEqual(facts(evaluate(text))["Q5"]["status"], "omitted")

    def test_rounding_tolerance_is_not_infinite(self):
        self.assertTrue(MODULE.equal(1.01, 1.001))
        self.assertFalse(MODULE.equal(1.02, 1.001))
        self.assertFalse(MODULE.equal(float("nan"), 1))
        self.assertEqual(MODULE.numeric("1,234.56"), 1234.56)

    def test_zero_valid_energy_and_undefined_percent_are_not_nonfinite_energy(self):
        parsed = MODULE.parse_report("| Option | Nominal annual kWh |\n| --- | ---: |\n| X | 0 |\n| Y | 0 |\n\nChange percentage: undefined")
        self.assertEqual(parsed["derived"]["Q1"][0]["value"], {"ids": ["X", "Y"], "energyKWh": 0})
        self.assertEqual(parsed["nonFiniteTokens"], [])

    def test_manifest_integrity_and_traversal_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            bundle = root / "bundle"
            bundle.mkdir()
            protocol = {"id": MODULE.PROTOCOL_ID, "cases": [fixture()]}
            payload = (json.dumps(protocol) + "\n").encode()
            (root / "expected.json").write_bytes(payload)
            (bundle / "protocol.json").write_bytes(payload)
            (bundle / "cases.json").write_text(json.dumps(protocol["cases"]))
            manifest = {"schema": "sios-report-benchmark-1", "sourceCommit": "test", "protocolSha256": MODULE.digest(payload),
                        "files": [{"path": p.name, "sha256": MODULE.digest(p.read_bytes()), "bytes": p.stat().st_size} for p in bundle.iterdir()]}
            (bundle / "manifest.json").write_text(json.dumps(manifest))
            MODULE.validate_input(bundle, root / "expected.json")
            (bundle / "cases.json").write_text("[]")
            with self.assertRaisesRegex(ValueError, "integrity"):
                MODULE.validate_input(bundle, root / "expected.json")
            manifest["files"][0]["path"] = "../expected.json"
            (bundle / "manifest.json").write_text(json.dumps(manifest))
            with self.assertRaisesRegex(ValueError, "Unsafe"):
                MODULE.validate_input(bundle, root / "expected.json")


if __name__ == "__main__":
    unittest.main()
