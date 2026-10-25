#!/usr/bin/env python3
"""Exercise portable replay in a temporary tree with no Git repository."""
import argparse
import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
parser = argparse.ArgumentParser()
parser.add_argument("--source", type=Path, default=Path("."))
parser.add_argument("--evidence", type=Path, default=Path("research-evidence"))
args, remaining = parser.parse_known_args()
HELPER = Path(__file__).with_name("replay_saved_reports.py")
spec = importlib.util.spec_from_file_location("portable_helper", HELPER)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PortableReplayTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="sios-portable-check-")
        self.root = Path(self.temporary.name)
        self.source, self.evidence = self.root / "source", self.root / "evidence"
        for name in module.SOURCE_PINS:
            target = self.source / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(args.source / name, target)
        for name in module.MANIFEST_PINS:
            shutil.copytree(args.evidence / name, self.evidence / name)

    def tearDown(self):
        self.temporary.cleanup()

    def run_replay(self):
        return subprocess.run([sys.executable, "-B", str(HELPER), "--source", str(self.source), "--evidence", str(self.evidence), "--output", str(self.root / "output")], cwd=self.root, capture_output=True, text=True)

    def test_no_git_or_plotting_setup_is_needed(self):
        self.assertFalse((self.source / ".git").exists())
        process = self.run_replay()
        self.assertEqual(process.returncode, 0, process.stderr)
        result = json.loads((self.root / "output/verification.json").read_text())
        self.assertEqual(result["unchangedControlFactRecords"], 216)
        self.assertEqual(result["primary"]["primary"]["evidence-v1"]["counts"]["explicit-correct"], 42)
        self.assertEqual(result["exploratory"]["primary"]["evidence-v2"]["counts"]["explicit-correct"], 48)

    def test_changed_extractor_is_rejected_before_execution(self):
        with (self.source / "scripts/research/evaluate-reports.py").open("a") as stream:
            stream.write("\nraise RuntimeError('must not execute')\n")
        process = self.run_replay()
        self.assertNotEqual(process.returncode, 0)
        self.assertIn("Source differs from the preserved rules", process.stderr)
        self.assertNotIn("RuntimeError: must not execute", process.stderr)
        self.assertFalse((self.root / "output").exists())

    def test_changed_report_is_rejected(self):
        report = next((self.evidence / "report-evaluation-2026-10-25-primary-inputs/reports").rglob("*.md"))
        report.write_text(report.read_text() + "\nChanged evidence\n")
        process = self.run_replay()
        self.assertNotEqual(process.returncode, 0)
        self.assertIn("Integrity failure", process.stderr)
        self.assertFalse((self.root / "output").exists())

    def test_extra_file_in_frozen_bundle_is_rejected(self):
        (self.evidence / "report-evaluation-2026-10-25-primary-inputs/extra.txt").write_text("not in manifest")
        process = self.run_replay()
        self.assertNotEqual(process.returncode, 0)
        self.assertIn("Manifest must cover exactly", process.stderr)

    def test_existing_outputs_are_not_overwritten(self):
        output = self.root / "output"
        output.mkdir()
        sentinel = output / "retained.txt"
        sentinel.write_text("keep")
        process = self.run_replay()
        self.assertNotEqual(process.returncode, 0)
        self.assertIn("Output directory already exists", process.stderr)
        self.assertEqual(sentinel.read_text(), "keep")


if __name__ == "__main__":
    unittest.main(argv=[sys.argv[0], *remaining])
