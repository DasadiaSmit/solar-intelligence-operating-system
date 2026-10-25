"""Small protocol-02 checks; no frozen scientific observations are evaluated."""
from __future__ import annotations
import copy
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("comparison", ROOT / "scripts/research/compare-pvlib.py")
comparison = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(comparison)


def fixture():
    protocol = json.loads((ROOT / "docs/research/assessment-protocol-02.json").read_text())
    config = {"location": {"latitude": 53.3811, "longitude": -1.4701, "elevationM": 95},
        "array": {"capacityKwDc": 48, "dcAcRatio": 1.2, "inverterEfficiency": .975, "tracking": "fixed",
                  "tiltDeg": 32, "azimuthDeg": 180, "temperatureCoefficientPerC": -.0034, "bifaciality": .72, "systemAgeYears": 2},
        "losses": {"snow": .002}}
    control = copy.deepcopy(config)
    control["array"].update({"bifaciality": 0, "systemAgeYears": 0}); control["losses"] = {"snow": 0}
    cases = []
    for name in comparison.CASES:
        year = int(name[-4:])
        times = pd.date_range(f"{year}-01-01T00:30:00Z", f"{year}-12-31T23:30:00Z", freq="h")
        times = times[~((times.month == 2) & (times.day == 29))]
        rows = [{**dict.fromkeys(comparison.REQUIRED_NUMBERS, 0.), "timestamp": t.isoformat(), "month": t.month} for t in times]
        cases.append({"id": name, "rows": rows, "originalAnnualKWh": 0., "controlledAnnualKWh": 0.})
    grid = [{"year": year, "candidate": {"id": f"tilt-{tilt}_azimuth-{az}", "tiltDeg": tilt, "azimuthDeg": az}, "annualKWh": 0., "monthlyKWh": [0.]*12}
            for year in [2022, 2023, 2024, 2025] for tilt in [22,32,42] for az in [162,180,198]]
    return {"schema": comparison.SCHEMA, "protocol": protocol, "config": config, "controlledConfig": control, "cases": cases, "arrayCases": grid}


class ComparisonTests(unittest.TestCase):
    def test_circular_angles_and_error_summary(self):
        np.testing.assert_allclose(comparison.circular_difference([359,1,180],[1,359,0]), [-2,2,-180])
        result = comparison.errors(np.array([-2., 0., 2.]))
        self.assertEqual(result["bias"], 0); self.assertEqual(result["maxAbs"], 2)
        self.assertAlmostEqual(result["rmse"], np.sqrt(8/3))
        self.assertIsNone(comparison.errors([], [])['mae'])
        with self.assertRaises(ValueError):comparison.errors([float('nan')])

    def test_known_front_surface_geometry_and_horizon_gate(self):
        # Horizontal surface: direct DNI*cos(zenith)*IAM, all DHI, no ground term.
        frame = pd.DataFrame({"dniWm2":[800.,800.], "ghiWm2":[600.,600.], "dhiWm2":[200.,200.], "albedo":[.2,.2]})
        poa = comparison.front_irradiance(frame, np.array([60.,100.]), np.array([180.,180.]), tilt=0, orientation=180)
        self.assertAlmostEqual(poa['direct'][0], 800*.5*.95, places=10)
        self.assertAlmostEqual(poa['diffuse'][0], 200)
        self.assertAlmostEqual(poa['reflected'][0], 0)
        self.assertAlmostEqual(poa['front'][0], 580, places=10)
        for values in poa.values():self.assertEqual(values[1], 0)

    def test_inverter_rating_is_ac_limit_not_module_rating(self):
        dc = np.array([0., 40/.975, 80.])
        for values in [comparison.ported_project_inverter(dc), comparison.pvwatts_inverter(dc)]:
            self.assertEqual(values[0], 0)
            self.assertTrue(np.all(values <= 40))
            self.assertAlmostEqual(values[-1], 40)
        self.assertAlmostEqual(comparison.pvwatts_inverter(dc)[1],40,places=10)

    def test_temperature_cap_is_explicit_policy_difference(self):
        frame = pd.DataFrame({"temperatureC":[-40., 25.], "windSpeedMps":[0.,0.]})
        result = comparison.power_chain(frame, np.array([100.,0.]), {"capacityKwDc":48,"temperatureCoefficientPerC":-.0034})
        self.assertGreater(result['dcLinear'][0], result['dcCapped'][0])
        self.assertAlmostEqual(result['dcCapped'][0],4.8*1.08)
        self.assertEqual(result['dcLinear'][1], 0)

    def test_capped_reference_uses_library_dc_with_shared_policy(self):
        array={"capacityKwDc":48,"temperatureCoefficientPerC":-.0034}
        with patch.object(comparison.pvlib.pvsystem, 'pvwatts_dc', wraps=comparison.pvlib.pvsystem.pvwatts_dc) as library_dc:
            result=comparison.capped_pvwatts_dc(np.array([1000.,1000.]),np.array([25.,-40.]),array)
            self.assertEqual(library_dc.call_count,1)
        np.testing.assert_allclose(result,[48.,51.84],atol=1e-12)

    def test_hourly_aggregation_preserves_energy(self):
        result = comparison.aggregate_energy([1.,2.,3.], [1,1,2])
        self.assertEqual(result['annualKWh'],6.)
        self.assertEqual(result['monthlyKWh'][:2],[3.,3.])
        self.assertEqual(sum(result['monthlyKWh']),result['annualKWh'])

    def test_payload_accepts_calendar_and_rejects_tampering(self):
        original=fixture()
        self.assertIs(comparison.validate_payload(original),original)
        mutations = [
            lambda p:p['cases'].reverse(),
            lambda p:p['cases'][0]['rows'].pop(),
            lambda p:p['cases'][0]['rows'][0].update(timestamp='2022-01-01T01:30:00Z'),
            lambda p:p['cases'][0]['rows'][0].update(ghiWm2=float('nan')),
            lambda p:p['cases'][0].update(controlledAnnualKWh=1),
            lambda p:p['controlledConfig']['array'].update(bifaciality=.72),
            lambda p:p['controlledConfig']['losses'].update(snow=.01),
            lambda p:p['arrayCases'].pop(),
            lambda p:p['arrayCases'][0]['monthlyKWh'].__setitem__(0,1),
        ]
        for index,mutate in enumerate(mutations):
            with self.subTest(mutation=index):
                p=copy.deepcopy(original);mutate(p)
                with self.assertRaises(ValueError):comparison.validate_payload(p)

    def test_manifest_rejects_modified_compressed_payload(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp);raw=gzip.compress(b'{}')
            (folder/'inputs.json.gz').write_bytes(raw+b'x')
            (folder/'manifest.json').write_text(json.dumps({'schema':comparison.SCHEMA,'files':[{'path':'inputs.json.gz','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}]}))
            with self.assertRaisesRegex(ValueError,'integrity failure'):
                comparison.load_inputs(folder, ROOT/'docs/research/assessment-protocol-02.json')


if __name__ == '__main__':
    unittest.main()
