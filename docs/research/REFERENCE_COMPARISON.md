# Independent component and model-choice comparison

This is protocol 02, frozen at commit `f62f709` before inspecting its new outputs. It preserves the original four-year study and application calculations. Read `assessment-protocol-02.json` for the full cases, metrics, tolerances and boundaries.

## What is compared

The external implementation is **pvlib-python 0.13.1**, deliberately pinned for reproducibility. It is not claimed to be the latest release. The comparison uses its versioned solar-position, isotropic transposition, ASHRAE incidence modifier, Faiman temperature and PVWatts DC/AC functions.

Two kinds of evidence must remain distinct:

1. **Matched-input component checks:** compare the project's front irradiance and temperature/DC calculations with pvlib using the same inputs and explicit application policies. Agreement verifies implementation consistency; shared assumptions can still be physically wrong.
2. **Model-choice sensitivity:** in a separately labelled monofacial diagnostic, replace solar geometry, temperature-factor clipping and inverter behaviour in sequence. These differences describe modelling choices. They are not forecast errors or measured-production errors.

The original configuration is bifacial and contains weather-dependent snow and other losses. The controlled copy sets bifaciality and system age to zero, removes all configured loss fractions and explicitly zeros module snow depth. It retains weather/albedo, capacity, geometry and inverter rating. It does not replace the original scenario, and its annual totals must not be quoted as revisions of the original 49,248.56 kWh result.

The custom inverter used in intermediate stages is a ported application policy, not an independent inverter validation. The final stage uses PVWatts AC at the same 40 kW output capacity. The same nine array candidates are compared under both controlled pipelines; their agreement does not validate the original bifacial ranking.

## Reproduction

Use a clean committed checkout. Node dependencies are the existing application dependencies. Python dependencies are pinned in `scripts/research/requirements-reference.txt`; install them in a separate environment.

```sh
pnpm research:reference-export \
  /absolute/path/to/sheffield-2026-10-25-analysis \
  /absolute/path/to/new-reference-inputs

python scripts/research/compare-pvlib.py \
  /absolute/path/to/new-reference-inputs \
  /absolute/path/to/new-reference-results
```

Each output directory must be new. The exporter verifies the original result manifest and frozen input bundle, reproduces the original five annual totals exactly, and creates an explicit controlled copy. The Python comparison checks input hashes and the protocol before producing results. Core outputs, runtime versions and source identity are recorded in manifests. Reproduce from the saved inputs; do not fetch new weather for a replay.

Run the new source checks with `node --import tsx --test tests/reference-export.test.mjs`, the Python checks with `PYTHONDONTWRITEBYTECODE=1 python tests/test_pvlib_comparison.py`, and the normal TypeScript/lint checks. These support software correctness; they do not substitute for independent field measurements.

## Primary method references

- [pvlib solar-position SPA](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.solarposition.spa_python.html): geometric and apparent outputs have different meanings. The primary comparison and irradiance calculations use geometric elevation/zenith.
- [Isotropic transposition](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.irradiance.get_total_irradiance.html) and [ASHRAE optical modifier](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.iam.ashrae.html): apply the beam modifier once; the application's front irradiance already includes it.
- [Faiman temperature](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.temperature.faiman.html): generic coefficients and shared irradiance/wind inputs do not establish site-specific module temperature. The application's wind is the provider's unadjusted 10-metre value.
- [PVWatts DC](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.pvsystem.pvwatts_dc.html): the linear temperature factor differs from the project's bounded factor. Report affected hours and their energy effect.
- [PVWatts AC](https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.inverter.pvwatts.html): inverter DC reference power is AC nameplate divided by nominal efficiency, not the module DC nameplate.

## Interpretation limits

The archive is reanalysis, the target is modelled energy, and 2025 had already been inspected. The representative 2026 calendar is constructed, not observed. Rear-side geometry, ground/row shading, wind-height calibration, snow dynamics, irradiance quality and actual equipment performance remain outside independent validation here. Hourly weather averages cannot establish subhourly clipping accuracy. Preserve discrepancies and negative findings; use a new protocol for any correction or wider test.
