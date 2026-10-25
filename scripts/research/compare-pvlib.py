#!/usr/bin/env python3
"""Protocol 02: independently implemented primitives and controlled model choices.

Usage: python compare-pvlib.py INPUT_DIRECTORY NEW_OUTPUT_DIRECTORY
Reads the frozen input export; no data downloads or calibration are performed.
"""
from __future__ import annotations

import base64
import gzip
import hashlib
import importlib.metadata
import json
import math
from pathlib import Path
import platform
import socket
import subprocess
import sys

import markdown
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import pvlib

SCHEMA = "sios-reference-input-1"
CASES = ["2022", "2023", "2024", "2025", "representative-2026"]
STAGES = ["project", "matched-primitives", "spa-geometry", "linear-temperature", "pvwatts-inverter"]
REQUIRED_NUMBERS = ["month", "temperatureC", "windSpeedMps", "surfacePressureHpa", "albedo",
    "ghiWm2", "dniWm2", "dhiWm2", "snowDepthCm", "elevationDeg", "zenithDeg", "azimuthDeg",
    "apparentElevationDeg", "directWm2", "diffuseWm2", "reflectedWm2", "frontWm2", "effectiveWm2",
    "cellTemperatureC", "idealDcKWh", "temperatureFactor", "temperatureAdjustedDcKw", "originalAcKw",
    "controlledPoaWm2", "controlledTemperatureC", "controlledDcKw", "controlledAcKw"]


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def require(condition, detail):
    if not condition:
        raise ValueError(detail)


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def circular_difference(a, b):
    """Signed difference in degrees on [-180, 180); a minus b."""
    return (np.asarray(a, dtype=float) - np.asarray(b, dtype=float) + 180) % 360 - 180


def errors(difference, mask=None):
    values = np.asarray(difference, dtype=float)
    if mask is not None:
        values = values[np.asarray(mask, dtype=bool)]
    require(np.isfinite(values).all(), "Non-finite comparison values")
    if values.size == 0:
        return {"n": 0, "mae": None, "rmse": None, "bias": None, "maxAbs": None}
    return {"n": int(values.size), "mae": float(np.mean(np.abs(values))),
            "rmse": float(np.sqrt(np.mean(values ** 2))), "bias": float(np.mean(values)),
            "maxAbs": float(np.max(np.abs(values)))}


def validate_payload(payload, expected_protocol=None):
    require(isinstance(payload, dict) and payload.get("schema") == SCHEMA, "Incorrect input schema")
    protocol = payload.get("protocol", {})
    require(protocol.get("id") == "independent-component-comparison-02" and protocol.get("version") == "1.0.0", "Incorrect protocol")
    require(protocol.get("reference", {}).get("version") == "0.13.1", "Incorrect reference version")
    if expected_protocol is not None:
        require(protocol == expected_protocol, "Exported protocol differs from committed protocol")
    config, control = payload.get("config", {}), payload.get("controlledConfig", {})
    for c in (config, control):
        location, array = c.get("location", {}), c.get("array", {})
        require(all(finite(location.get(k)) for k in ["latitude", "longitude", "elevationM"]), "Invalid location")
        require(-90 <= location["latitude"] <= 90 and -180 <= location["longitude"] <= 180, "Invalid coordinates")
        require(array.get("capacityKwDc") == 48 and array.get("dcAcRatio") == 1.2 and array.get("inverterEfficiency") == .975, "Inconsistent ratings")
        require(array.get("tracking") == "fixed" and array.get("tiltDeg") == 32 and array.get("azimuthDeg") == 180, "Inconsistent baseline orientation")
        require(array.get("temperatureCoefficientPerC") == -.0034, "Inconsistent temperature coefficient")
    require(config["location"] == control["location"], "Location changed in controlled configuration")
    require(control["array"].get("bifaciality") == 0 and control["array"].get("systemAgeYears") == 0, "Invalid controlled array")
    require(bool(control.get("losses")) and all(finite(v) and v == 0 for v in control["losses"].values()), "Controlled losses must all be zero")
    cases = payload.get("cases", [])
    require([c.get("id") for c in cases] == CASES, "Incorrect case order or missing/duplicate case")
    for case in cases:
        year = int(case["id"][-4:])
        expected = pd.date_range(f"{year}-01-01T00:30:00Z", f"{year}-12-31T23:30:00Z", freq="h")
        expected = expected[~((expected.month == 2) & (expected.day == 29))]
        rows = case.get("rows", [])
        require(len(rows) == 8760, "Every case must contain 8760 rows")
        for i, row in enumerate(rows):
            require(all(finite(row.get(k)) for k in REQUIRED_NUMBERS), f"Incomplete/non-finite row {case['id']}:{i}")
            timestamp = pd.Timestamp(row.get("timestamp"))
            require(timestamp.tz is not None and timestamp == expected[i], f"Invalid chronology at {case['id']}:{i}")
            require(row["month"] == expected[i].month, "Month does not match UTC midpoint")
            require(row["windSpeedMps"] >= 0 and 0 <= row["albedo"] <= 1, "Invalid weather domain")
            require(all(row[k] >= 0 for k in ["ghiWm2", "dniWm2", "dhiWm2", "effectiveWm2", "originalAcKw", "controlledAcKw"]), "Invalid nonnegative quantity")
        for total, field in [("originalAnnualKWh", "originalAcKw"), ("controlledAnnualKWh", "controlledAcKw")]:
            require(finite(case.get(total)) and abs(sum(r[field] for r in rows) - case[total]) < 1e-6, "Annual total does not reconcile")
    array_cases = payload.get("arrayCases", [])
    expected_keys = {(year, tilt, azimuth) for year in [2022, 2023, 2024, 2025] for tilt in [22, 32, 42] for azimuth in [162, 180, 198]}
    keys = [(c.get("year"), c.get("candidate", {}).get("tiltDeg"), c.get("candidate", {}).get("azimuthDeg")) for c in array_cases]
    require(len(keys) == 36 and set(keys) == expected_keys, "Incorrect or duplicated array grid")
    for c in array_cases:
        require(c["candidate"].get("id") == f"tilt-{c['candidate']['tiltDeg']}_azimuth-{c['candidate']['azimuthDeg']}", "Incorrect candidate identity")
        require(finite(c.get("annualKWh")) and len(c.get("monthlyKWh", [])) == 12 and all(finite(x) and x >= 0 for x in c["monthlyKWh"]), "Invalid array energy")
        require(abs(sum(c["monthlyKWh"]) - c["annualKWh"]) < 1e-6, "Array monthly totals do not reconcile")
    return payload


def load_inputs(directory: Path, protocol_path: Path):
    manifest = json.loads((directory / "manifest.json").read_text())
    require(manifest.get("schema") == SCHEMA, "Incorrect manifest schema")
    seen = set()
    for record in manifest["files"]:
        name = record["path"]
        require(Path(name).name == name and name not in seen, "Manifest paths must be unique local names")
        seen.add(name)
        raw = (directory / name).read_bytes()
        require(len(raw) == record["bytes"] and digest(raw) == record["sha256"], f"Input integrity failure: {name}")
    require("inputs.json.gz" in seen, "Missing input payload")
    protocol_bytes = protocol_path.read_bytes()
    require(manifest.get("protocolSha256") == digest(protocol_bytes), "Protocol hash differs from committed protocol")
    payload = json.loads(gzip.decompress((directory / "inputs.json.gz").read_bytes()))
    validate_payload(payload, json.loads(protocol_bytes))
    return payload, manifest


def solar_spa(frame, location):
    return pvlib.solarposition.spa_python(pd.DatetimeIndex(frame["timestamp"]),
        location["latitude"], location["longitude"], altitude=location["elevationM"],
        pressure=101325., temperature=12., delta_t=67., how="numpy")


def front_irradiance(frame, zenith, azimuth, tilt=32, orientation=180):
    zenith, azimuth = np.asarray(zenith), np.asarray(azimuth)
    values = pvlib.irradiance.get_total_irradiance(tilt, orientation, zenith, azimuth,
        frame["dniWm2"].to_numpy(), frame["ghiWm2"].to_numpy(), frame["dhiWm2"].to_numpy(),
        albedo=np.clip(frame["albedo"].to_numpy(), 0, .95), model="isotropic")
    aoi = pvlib.irradiance.aoi(tilt, orientation, zenith, azimuth)
    gate = zenith < 90
    direct = np.where(gate, np.asarray(values["poa_direct"]) * pvlib.iam.ashrae(aoi, b=.05), 0.)
    diffuse = np.where(gate, values["poa_sky_diffuse"], 0.)
    reflected = np.where(gate, values["poa_ground_diffuse"], 0.)
    return {"direct": direct, "diffuse": diffuse, "reflected": reflected,
            "front": np.maximum(0, direct + diffuse + reflected)}


def ported_project_inverter(dc_kw, capacity_kw=48., dc_ac_ratio=1.2, efficiency=.975):
    """Application policy port, deliberately NOT an independent inverter model."""
    dc = np.asarray(dc_kw, dtype=float)
    ac_capacity = capacity_kw / max(1., dc_ac_ratio)
    adjustment = np.where(dc <= 0, 0., .92 + .08 * np.sqrt(np.clip(dc / ac_capacity, 0, 1)))
    return np.minimum(ac_capacity, dc * np.clip(efficiency * adjustment, 0, 1))


def pvwatts_inverter(dc_kw, capacity_kw=48., dc_ac_ratio=1.2, efficiency=.975):
    ac_capacity_w = 1000 * capacity_kw / dc_ac_ratio
    return np.asarray(pvlib.inverter.pvwatts(np.asarray(dc_kw) * 1000,
        pdc0=ac_capacity_w / efficiency, eta_inv_nom=efficiency, eta_inv_ref=.9637)) / 1000


def capped_pvwatts_dc(irradiance, temperature, array):
    """pvlib DC with an explicit shared temperature-factor policy wrapper.

    The equivalent temperature is only an algebraic input to pvlib; it is not
    a corrected or newly predicted physical module temperature.
    """
    gamma = array["temperatureCoefficientPerC"]
    require(gamma != 0, "Temperature-policy wrapper requires a nonzero coefficient")
    raw_factor = 1 + gamma * (np.asarray(temperature)-25)
    equivalent_temperature = 25 + (np.clip(raw_factor, .65, 1.08)-1)/gamma
    return np.asarray(pvlib.pvsystem.pvwatts_dc(irradiance, equivalent_temperature,
        pdc0=array["capacityKwDc"]*1000, gamma_pdc=gamma, temp_ref=25.))/1000


def power_chain(frame, front, array):
    temperature = np.asarray(pvlib.temperature.faiman(front, frame["temperatureC"].to_numpy(),
        frame["windSpeedMps"].to_numpy(), u0=25., u1=6.84))
    dc_linear = np.asarray(pvlib.pvsystem.pvwatts_dc(front, temperature,
        pdc0=array["capacityKwDc"] * 1000, gamma_pdc=array["temperatureCoefficientPerC"], temp_ref=25.)) / 1000
    dc_capped = capped_pvwatts_dc(front, temperature, array)
    return {"temperature": temperature, "dcLinear": dc_linear, "dcCapped": dc_capped,
        "cappedProjectAc": ported_project_inverter(dc_capped),
        "linearProjectAc": ported_project_inverter(dc_linear),
        "pvwattsAc": pvwatts_inverter(dc_linear)}


def aggregate_energy(values, months):
    values, months = np.asarray(values), np.asarray(months)
    return {"annualKWh": float(np.sum(values)), "monthlyKWh": [float(np.sum(values[months == m])) for m in range(1, 13)]}


def compare_case(case, config, protocol):
    frame = pd.DataFrame(case["rows"])
    frame["timestamp"] = pd.to_datetime(frame["timestamp"], utc=True)
    spa = solar_spa(frame, config["location"])
    spa_elevation = spa["elevation"].to_numpy()
    elevation_diff = frame["elevationDeg"].to_numpy() - spa_elevation
    azimuth_diff = circular_difference(frame["azimuthDeg"], spa["azimuth"])
    masks = {"all": np.ones(len(frame), dtype=bool), "daylightAbove5Degrees": spa_elevation > 5,
             "nearHorizonWithin5Degrees": np.abs(spa_elevation) <= 5}
    geometry = {group: {"elevationDegrees": errors(elevation_diff, mask),
                "azimuthDegrees": errors(azimuth_diff, mask),
                "apparentElevationDegrees": errors(frame["apparentElevationDeg"].to_numpy()-spa["apparent_elevation"].to_numpy(), mask)}
                for group, mask in masks.items()}
    daylight = masks["daylightAbove5Degrees"]
    geometry["daylightElevationDifferenceAboveHalfDegreeFraction"] = float(np.mean(np.abs(elevation_diff[daylight]) > .5)) if daylight.any() else None
    geometry["monthlyDaylightElevationMaeDegrees"] = [errors(elevation_diff, daylight & (frame["month"].to_numpy() == m))["mae"] for m in range(1, 13)]
    geometry["differentPositiveElevationGateHours"] = int(np.sum((frame["elevationDeg"].to_numpy() > 0) != (spa_elevation > 0)))
    matched = front_irradiance(frame, frame["zenithDeg"], frame["azimuthDeg"])
    independent = front_irradiance(frame, spa["zenith"], spa["azimuth"])
    original_effective = frame["effectiveWm2"].to_numpy()
    original_temp = np.asarray(pvlib.temperature.faiman(original_effective, frame["temperatureC"], frame["windSpeedMps"], u0=25, u1=6.84))
    original_linear_dc = np.asarray(pvlib.pvsystem.pvwatts_dc(original_effective, frame["cellTemperatureC"], pdc0=48000, gamma_pdc=-.0034, temp_ref=25)) / 1000
    original_factor = 1 - .0034 * (frame["cellTemperatureC"].to_numpy()-25)
    original_capped_dc = capped_pvwatts_dc(original_effective, frame["cellTemperatureC"].to_numpy(), config["array"])
    comparisons = {"directWm2": (matched["direct"], frame["directWm2"]),
        "diffuseWm2": (matched["diffuse"], frame["diffuseWm2"]),
        "reflectedWm2": (matched["reflected"], frame["reflectedWm2"]),
        "frontWm2": (matched["front"], frame["frontWm2"]),
        "faimanTemperatureC": (original_temp, frame["cellTemperatureC"]),
        "temperatureCappedDcKw": (original_capped_dc, frame["temperatureAdjustedDcKw"]),
        "linearDcVersusCappedProjectKw": (original_linear_dc, frame["temperatureAdjustedDcKw"])}
    components = {name: errors(np.asarray(a)-np.asarray(b)) for name, (a,b) in comparisons.items()}
    tolerance = protocol["numericalParityTolerances"]
    parity = {name: {"maximumAbsoluteDifference": metric["maxAbs"],
                    "tolerance": tolerance["irradianceWm2" if name.endswith("Wm2") else "temperatureC" if name == "faimanTemperatureC" else "powerKw"],
                    "passes": metric["maxAbs"] <= tolerance["irradianceWm2" if name.endswith("Wm2") else "temperatureC" if name == "faimanTemperatureC" else "powerKw"]}
              for name, metric in components.items() if name != "linearDcVersusCappedProjectKw"}
    m_chain = power_chain(frame, matched["front"], config["array"])
    s_chain = power_chain(frame, independent["front"], config["array"])
    stage_values = {"project": frame["controlledAcKw"].to_numpy(), "matched-primitives": m_chain["cappedProjectAc"],
        "spa-geometry": s_chain["cappedProjectAc"], "linear-temperature": s_chain["linearProjectAc"],
        "pvwatts-inverter": s_chain["pvwattsAc"]}
    for name, values in stage_values.items():
        require(np.isfinite(values).all() and (values >= -1e-10).all() and (values <= 40+1e-10).all(), f"Invalid stage power: {name}")
    control_checks = {"controlledFrontWm2": errors(matched["front"]-frame["controlledPoaWm2"].to_numpy()),
        "controlledTemperatureC": errors(m_chain["temperature"]-frame["controlledTemperatureC"].to_numpy()),
        "controlledDcKw": errors(m_chain["dcCapped"]-frame["controlledDcKw"].to_numpy()),
        "controlledAcKw": errors(stage_values["matched-primitives"]-stage_values["project"])}
    for name, metric in control_checks.items():
        tol = tolerance["irradianceWm2" if name.endswith("Wm2") else "temperatureC" if name.endswith("TemperatureC") else "powerKw"]
        parity[name] = {"maximumAbsoluteDifference": metric["maxAbs"], "tolerance": tol, "passes": metric["maxAbs"] <= tol}
    stages = []
    previous = None
    project_total = float(np.sum(stage_values["project"]))
    for name in STAGES:
        energy = aggregate_energy(stage_values[name], frame["month"])
        total = energy["annualKWh"]
        stages.append({"id": name, **energy, "deltaFromPreviousKWh": None if previous is None else total-previous,
            "deltaFromPreviousPct": None if previous is None or previous == 0 else (total/previous-1)*100,
            "deltaFromProjectKWh": total-project_total, "deltaFromProjectPct": (total/project_total-1)*100 if project_total else None})
        previous = total
    caps = (original_effective > 0) & ((original_factor < .65) | (original_factor > 1.08))
    summary = {"id": case["id"], "rows": len(frame), "originalScenarioAnnualKWh": case["originalAnnualKWh"],
        "geometry": geometry, "components": components, "controlledComponents": control_checks, "parity": parity,
        "allParityChecksPass": all(row["passes"] for row in parity.values()), "stages": stages,
        "temperatureCap": {"positiveIrradianceHoursAffected": int(caps.sum()), "upperCapHours": int(((original_effective>0)&(original_factor>1.08)).sum()),
            "lowerCapHours": int(((original_effective>0)&(original_factor<.65)).sum()),
            "originalPreLossCappedMinusLinearDcKWh": float(np.sum(original_capped_dc-original_linear_dc))},
        "controlledClipping": {name: int(np.sum(values >= 40-1e-10)) for name, values in stage_values.items()}}
    hourly = pd.DataFrame({"case": case["id"], "timestamp": frame["timestamp"].dt.strftime("%Y-%m-%dT%H:%M:%SZ"), "month": frame["month"],
        "projectElevationDeg": frame["elevationDeg"], "spaElevationDeg": spa_elevation, "elevationDifferenceDeg": elevation_diff,
        "azimuthCircularDifferenceDeg": azimuth_diff, "matchedFrontWm2": matched["front"], "spaFrontWm2": independent["front"],
        "originalEffectiveWm2": original_effective, "originalFaimanTemperatureC": original_temp,
        "originalLinearPreLossDcKw": original_linear_dc, "originalCappedPreLossDcKw": original_capped_dc,
        "controlledMatchedTemperatureC": m_chain["temperature"], "controlledSpaTemperatureC": s_chain["temperature"],
        "controlledSpaLinearDcKw": s_chain["dcLinear"], "controlledSpaCappedDcKw": s_chain["dcCapped"],
        **{f"{name}AcKw": values for name,values in stage_values.items()}})
    return summary, hourly, frame, spa


def compare_arrays(payload, frames):
    rows, decisions = [], []
    for year in [2022, 2023, 2024, 2025]:
        frame, spa = frames[str(year)]
        choices = [c for c in payload["arrayCases"] if c["year"] == year]
        year_rows = []
        for c in choices:
            design = c["candidate"]
            irr = front_irradiance(frame, spa["zenith"], spa["azimuth"], design["tiltDeg"], design["azimuthDeg"])
            energy = aggregate_energy(power_chain(frame, irr["front"], payload["config"]["array"])["pvwattsAc"], frame["month"])
            row = {"year": year, "candidate": design["id"], "tiltDeg": design["tiltDeg"], "azimuthDeg": design["azimuthDeg"],
                   "projectAnnualKWh": c["annualKWh"], "pvlibAnnualKWh": energy["annualKWh"],
                   "projectMonthlyKWh": c["monthlyKWh"], "pvlibMonthlyKWh": energy["monthlyKWh"]}
            rows.append(row); year_rows.append(row)
        project_best = max(r["projectAnnualKWh"] for r in year_rows)
        pvlib_best = max(r["pvlibAnnualKWh"] for r in year_rows)
        project_winners = [r["candidate"] for r in year_rows if project_best-r["projectAnnualKWh"] <= 1e-6]
        pvlib_winners = [r["candidate"] for r in year_rows if pvlib_best-r["pvlibAnnualKWh"] <= 1e-6]
        reversed_pairs = []
        for i, a in enumerate(year_rows):
            for b in year_rows[i+1:]:
                d1, d2 = a["projectAnnualKWh"]-b["projectAnnualKWh"], a["pvlibAnnualKWh"]-b["pvlibAnnualKWh"]
                if abs(d1)>1e-6 and abs(d2)>1e-6 and d1*d2<0:
                    reversed_pairs.append([a["candidate"], b["candidate"]])
        decisions.append({"year": year, "projectWinnerIds": project_winners, "pvlibWinnerIds": pvlib_winners,
            "sameWinners": set(project_winners)==set(pvlib_winners), "reversedPairs": reversed_pairs,
            "projectRanking": [r["candidate"] for r in sorted(year_rows,key=lambda x:(-x["projectAnnualKWh"],x["candidate"]))],
            "pvlibRanking": [r["candidate"] for r in sorted(year_rows,key=lambda x:(-x["pvlibAnnualKWh"],x["candidate"]))]})
    return {"rows": rows, "decisions": decisions, "tieToleranceKWh": 1e-6,
            "interpretation": "Controlled monofacial model comparison; does not independently validate the original bifacial winner."}


def report_text(comparison):
    cases = comparison["cases"]
    failures = [(c["id"], k) for c in cases for k,v in c["parity"].items() if not v["passes"]]
    lines = ["# Independent component and model-choice comparison", "",
        "Protocol 02 · Sheffield · 2022–2025 and constructed 2026 representative weather · pvlib-python 0.13.1", "",
        "This study checks selected calculations against an independent library and measures the effect of changing model choices. It uses historical ERA5 weather and computed PV generation. No measured production or fresh untouched forecast test is included.", "",
        "## Findings under matched inputs", "",
        ("All predeclared numerical parity checks passed." if not failures else f"**{len(failures)} numerical parity checks failed.** These are retained for investigation: "+", ".join(f"{c}/{k}" for c,k in failures)+"."),
        "Parity covers isotropic front irradiance with the same geometry and beam IAM, Faiman with the same input irradiance/wind, pvlib DC with the project's explicit temperature-cap wrapper, and integration with a port of the project's inverter. The cap wrapper supplies an algebraically equivalent bounded temperature to pvlib; it does not change the predicted physical temperature. These checks verify implementation agreement within stated tolerances; they do not validate the shared physical assumptions or the copied inverter policy.", "",
        "| Case | Daylight elevation MAE (°) | Daylight elevation max (°) | Daylight differences >0.5° (%) | Positive-irradiance temperature-cap hours |", "| --- | ---: | ---: | ---: | ---: |"]
    for c in cases:
        g=c["geometry"];d=g["daylightAbove5Degrees"]["elevationDegrees"]
        lines.append(f"| {c['id']} | {d['mae']:.4f} | {d['maxAbs']:.4f} | {100*g['daylightElevationDifferenceAboveHalfDegreeFraction']:.2f} | {c['temperatureCap']['positiveIrradianceHoursAffected']} |")
    lines += ["", "Daylight here means SPA geometric elevation above 5°. The 0.5° value is a predeclared investigation flag, not an accuracy standard. Full all-hour, near-horizon and circular-azimuth errors are retained in comparison.json. Geometric elevation is compared with geometric elevation; apparent elevation is a separate diagnostic.", "",
        "## Controlled annual-energy comparison", "",
        "The controlled configuration is a diagnostic 48 kWp monofacial copy with no added losses, zero system age and zero snow depth. It differs deliberately from the original bifacial/lossy research scenario. Its energy must not be substituted for the original annual estimate.", "",
        "| Case | Native project (kWh) | Matched primitives | SPA geometry | Linear temperature factor | PVWatts inverter | Final vs native (%) |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"]
    for c in cases:
        stages=c["stages"]
        percentage=stages[-1]['deltaFromProjectPct']
        percentage_text="undefined (zero baseline)" if percentage is None else f"{percentage:+.3f}"
        lines.append("| "+c["id"]+" | "+" | ".join(f"{x['annualKWh']:,.2f}" for x in stages)+f" | {percentage_text} |")
    lines += ["", "Each column changes only the next declared modelling choice: (1) native controlled application; (2) pvlib common primitives with application geometry, temperature cap and ported inverter; (3) SPA geometry; (4) remove the temperature-factor cap; (5) replace the inverter curve with PVWatts. These sequential deltas depend on this ordering and are not independent causal effects.", "",
        "Both inverters retain a 40 kW AC limit and 97.5% nominal efficiency. The PVWatts inverter DC input rating is 40,000/0.975 W; this differs from the modules' 48,000 W rating. A higher modelled output is not evidence that a model is more accurate.", "",
        "## Controlled array-ranking comparison", "",
        "| Historical year | Native controlled winner(s) | pvlib controlled winner(s) | Same winners? | Reversed option pairs |",
        "| --- | --- | --- | --- | ---: |"]
    for d in comparison["arrays"]["decisions"]:
        lines.append(f"| {d['year']} | {', '.join(d['projectWinnerIds'])} | {', '.join(d['pvlibWinnerIds'])} | {'Yes' if d['sameWinners'] else 'No'} | {len(d['reversedPairs'])} |")
    lines += ["", "The nine options use the predeclared 22°/32°/42° tilts and 162°/180°/198° azimuths at equal capacity. Ties are retained within 0.000001 kWh. A boundary winner is not a global optimum, and agreement in this controlled monofacial grid does not validate the original bifacial ranking.", "",
        "## Limits and what remains", "",
        "The original rear-irradiance proxy, loss assumptions, snow proxy, weather inputs and site/equipment configuration are not independently validated here. Generic Faiman coefficients use unadjusted 10 m wind, and thermal inputs use post-IAM effective irradiance; numerical agreement cannot establish the adequacy of those assumptions. Hourly radiation averages are evaluated at UTC interval midpoints, with all irradiance zeroed when geometric elevation is nonpositive. A representative year and four historical years cannot establish calibrated future probabilities.", "",
        "The existing production model and first-study evidence are preserved. These results support an implementation check and critical discussion of modelling assumptions. Field data, parameter calibration and a separate measured-production evaluation remain necessary for plant-accuracy claims.", "",
        "## Evidence and sources", "",
        "- comparison.json: all components, geometry strata, cap/gate/clipping diagnostics, energy stages and option rankings.",
        "- hourly-comparison.csv: all 43,800 hourly cases and stage outputs; annual-monthly.csv and array-comparison.csv: unrounded aggregate evidence.",
        "- protocol.json, reproduction.json and manifest.json: fixed method, source identity, runtime and file checksums.",
        "- Weather input: [Open-Meteo](https://open-meteo.com/) / ECMWF ERA5; [licence and attribution](https://open-meteo.com/en/licence). Adaptation and source hashes remain in the frozen input bundle."]
    for name, path in [("SPA", "solarposition.spa_python"), ("Isotropic transposition", "irradiance.get_total_irradiance"), ("ASHRAE IAM", "iam.ashrae"), ("Faiman", "temperature.faiman"), ("PVWatts DC", "pvsystem.pvwatts_dc"), ("PVWatts inverter", "inverter.pvwatts")]:
        lines.append(f"- [{name}, pvlib 0.13.1](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.{path}.html).")
    return "\n".join(lines)+"\n"


def draw_figures(comparison, output):
    plt.rcParams.update({"font.family":"DejaVu Sans", "font.size":10, "axes.spines.top":False,
        "axes.spines.right":False, "svg.fonttype":"none", "svg.hashsalt":"sios-pvlib-comparison-02"})
    cases=comparison["cases"]
    fig,ax=plt.subplots(figsize=(11,5.5))
    matrix=np.array([[s["deltaFromProjectPct"] for s in c["stages"]][1:] for c in cases],dtype=float)
    finite_values=matrix[np.isfinite(matrix)]
    limit=max(float(np.abs(finite_values).max()),.01) if finite_values.size else 1.
    im=ax.imshow(np.ma.masked_invalid(matrix),cmap="RdBu_r",vmin=-limit,vmax=limit,aspect="auto")
    for y in range(len(cases)):
        for x in range(4):ax.text(x,y,f"{matrix[y,x]:+.3f}%" if np.isfinite(matrix[y,x]) else "undefined",ha="center",va="center",color="white" if abs(matrix[y,x])/limit>.6 else "#183544")
    ax.set_yticks(range(len(cases)),[c["id"] for c in cases]);ax.set_xticks(range(4),["Matched\nprimitives","SPA\ngeometry","Linear temperature\nfactor","PVWatts\ninverter"])
    ax.set_title("Controlled annual energy: difference from native project",loc="left",pad=15,fontweight="bold")
    fig.colorbar(im,ax=ax,label="Difference (%)");fig.text(.02,.02,"Sequential model choices; 48 kWp monofacial, no added losses. Differences do not establish accuracy.",fontsize=9)
    fig.tight_layout(rect=(0,.06,1,1));save_plot(fig,output,"01-controlled-energy")
    fig,ax=plt.subplots(figsize=(11,5.5))
    for c in cases:ax.plot(range(1,13),c["geometry"]["monthlyDaylightElevationMaeDegrees"],marker="o",markersize=4,label=c["id"])
    ax.set_xticks(range(1,13),["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"])
    ax.set_ylim(bottom=0);ax.set_ylabel("Mean absolute elevation difference (degrees)");ax.grid(alpha=.2)
    ax.set_title("Solar-position approximation compared with SPA",loc="left",pad=15,fontweight="bold");ax.legend(ncol=3,frameon=False)
    fig.text(.02,.02,"UTC interval midpoints; SPA geometric elevation >5°. Shared weather data; no measured-position validation.",fontsize=9)
    fig.tight_layout(rect=(0,.06,1,1));save_plot(fig,output,"02-geometry-differences")


def save_plot(fig, output, name):
    fig.savefig(output/f"{name}.png",dpi=180,bbox_inches="tight",metadata={"Software":"Solar Intelligence OS protocol02"})
    fig.savefig(output/f"{name}.svg",bbox_inches="tight",metadata={"Date":None,"Creator":"Solar Intelligence OS protocol02"})
    plt.close(fig)


def render_html(report,output):
    figures="".join(f'<figure><img alt="{name}" src="data:image/png;base64,{base64.b64encode((output/(name+".png")).read_bytes()).decode()}"></figure>' for name in ["01-controlled-energy","02-geometry-differences"])
    content=markdown.markdown(report,extensions=["tables"])
    page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Solar Intelligence — independent model comparison</title><style>
body{margin:0;background:#eff4f6;color:#183544;font:17px/1.65 system-ui,sans-serif}main{max-width:1120px;margin:32px auto;background:white;padding:44px;border-radius:20px;box-shadow:0 10px 35px #1232}h1{font-size:36px;line-height:1.2}h2{margin-top:40px;color:#246a8e}a{color:#246a8e}table{border-collapse:collapse;width:100%;font-size:14px;display:block;overflow:auto}th,td{padding:10px;border-bottom:1px solid #dbe4e8;text-align:left}th{background:#edf4f6}figure{margin:22px 0}img{width:100%;height:auto}p,li{max-width:100ch}@media(max-width:700px){main{margin:0;padding:22px;border-radius:0}h1{font-size:28px}}@media print{body{background:white}main{margin:0;padding:0;box-shadow:none}figure,table{break-inside:avoid}}
</style><main>'''+content+"<h2>Figures</h2>"+figures+"</main></html>"
    (output/"REPORT.html").write_text(page,encoding="utf-8")


def main():
    require(len(sys.argv)==3,"Usage: compare-pvlib.py INPUT_DIRECTORY NEW_OUTPUT_DIRECTORY")
    require(pvlib.__version__=="0.13.1", "Protocol requires pvlib 0.13.1")
    root=Path(__file__).resolve().parents[2]
    source_commit=subprocess.check_output(["git","rev-parse","HEAD"],cwd=root,text=True).strip()
    dirty=subprocess.check_output(["git","status","--porcelain"],cwd=root,text=True).strip()
    require(not dirty,"Commit the source before issuing scientific results")
    source,output=Path(sys.argv[1]).resolve(),Path(sys.argv[2]).resolve()
    require(not output.exists(),"Output directory must be new")
    payload,manifest=load_inputs(source,root/"docs/research/assessment-protocol-02.json")
    def no_network(*args,**kwargs):raise RuntimeError("Network disabled during reference comparison")
    socket.create_connection=no_network
    socket.socket.connect=no_network
    summaries,hourlies,frames=[],[],{}
    for case in payload["cases"]:
        summary,hourly,frame,spa=compare_case(case,payload["config"],payload["protocol"])
        summaries.append(summary);hourlies.append(hourly);frames[case["id"]]=(frame,spa)
    comparison={"schema":"sios-pvlib-comparison-1","protocolId":payload["protocol"]["id"],"referenceVersion":pvlib.__version__,
        "differenceSign":"component differences=pvlib minus project; solar angles=project minus SPA; energy deltas=listed stage minus preceding/native stage",
        "spaConditions":{"pressurePa":101325.,"temperatureC":12.,"deltaTSeconds":67.,"altitudeM":payload["config"]["location"]["elevationM"],"method":"numpy"},
        "cases":summaries,"arrays":compare_arrays(payload,frames),
        "allParityChecksPass":all(c["allParityChecksPass"] for c in summaries),
        "limitations":payload["protocol"]["knownSharedAssumptions"]+payload["protocol"]["excluded"]}
    output.mkdir()
    def json_write(name,value):(output/name).write_text(json.dumps(value,indent=2,allow_nan=False)+"\n")
    json_write("comparison.json",comparison)
    (output/"protocol.json").write_bytes((root/"docs/research/assessment-protocol-02.json").read_bytes())
    pd.concat(hourlies,ignore_index=True).to_csv(output/"hourly-comparison.csv",index=False,float_format="%.17g")
    energy_rows=[]
    for case in summaries:
        for stage in case["stages"]:
            energy_rows.append({"case":case["id"],"stage":stage["id"],"month":"annual","kWh":stage["annualKWh"]})
            energy_rows.extend({"case":case["id"],"stage":stage["id"],"month":i+1,"kWh":v} for i,v in enumerate(stage["monthlyKWh"]))
    pd.DataFrame(energy_rows).to_csv(output/"annual-monthly.csv",index=False,float_format="%.17g")
    array_rows=[]
    for row in comparison["arrays"]["rows"]:
        for model in ["project","pvlib"]:
            array_rows.append({"year":row["year"],"candidate":row["candidate"],"model":model,"month":"annual","kWh":row[f"{model}AnnualKWh"]})
            array_rows.extend({"year":row["year"],"candidate":row["candidate"],"model":model,"month":i+1,"kWh":v} for i,v in enumerate(row[f"{model}MonthlyKWh"]))
    pd.DataFrame(array_rows).to_csv(output/"array-comparison.csv",index=False,float_format="%.17g")
    report=report_text(comparison);(output/"REPORT.md").write_text(report)
    draw_figures(comparison,output);render_html(report,output)
    runtime={"python":platform.python_version(),**{name:importlib.metadata.version(name) for name in ["pvlib","numpy","pandas","scipy","matplotlib","Markdown"]}}
    json_write("reproduction.json",{"sourceCommit":source_commit,"inputSourceCommit":manifest["sourceCommit"],"inputManifestSha256":digest((source/"manifest.json").read_bytes()),
        "protocolSha256":manifest["protocolSha256"],"inputDirectory":str(source),"networkDisabled":True,"scriptSha256":digest(Path(__file__).read_bytes()),"runtime":runtime,"outputHours":sum(c["rows"] for c in summaries),"sourceClean":True})
    files=[{"path":p.name,"sha256":digest(p.read_bytes()),"bytes":p.stat().st_size} for p in sorted(output.iterdir()) if p.is_file()]
    json_write("manifest.json",{"schema":"sios-pvlib-comparison-evidence-1","sourceCommit":source_commit,"inputManifestSha256":digest((source/"manifest.json").read_bytes()),"protocolSha256":manifest["protocolSha256"],"runtime":runtime,"files":files})
    print(json.dumps({"output":str(output),"allParityChecksPass":comparison["allParityChecksPass"],"hours":sum(c["rows"] for c in summaries),"files":len(files)}))


if __name__ == "__main__":
    main()
