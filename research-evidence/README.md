# Frozen assessment evidence

These are the unchanged inputs and outputs used in three computational studies. Start with the readable reports below; use the original manifests for content identity and the portable replay guide to check the report findings on another computer.

| Study | Readable result | Main evidence |
| --- | --- | --- |
| Sheffield weather and array sensitivity | [Study 01 report](sheffield-2026-10-25-analysis/presentation/REPORT.html) | Four ERA5 years; baseline 49,248.56 kWh; source omissions 47,150.23–51,936.45 kWh; nine designs; zero added regret benefit |
| Independent component and model comparison | [Study 02 report](pvlib-2026-10-25-results/REPORT.html) | 50 matched checks over 43,800 hourly cases; controlled annual-energy difference 1.703–1.789% |
| Primary report information comparison | [Study 03 primary report](report-evaluation-2026-10-25-primary-results/REPORT.html) | Original report: 42 explicit + 6 derivable facts; tables: 12 + 36; point estimate: 18 explicit, 30 omitted |
| Exploratory report revision | [Same-case revision](report-evaluation-2026-10-25-exploratory-results/REPORT.html) | 48 explicit complete-case facts; partial evidence and stale recommendations handled; known-case development evidence |

Open the downloaded HTML files in a browser. GitHub may show their source rather than render them. These files are self-contained research reports; the academic main report is separate.

The eight study directories retain their original names and bytes. Some historical metadata contains the original machine's input path; that is provenance, not a path required by the portable workflow. New outputs belong under `outputs/` and must not overwrite these studies.

See [the quick-start guide](../RUN_ME.md), [portable reproduction details](../docs/research/REPRODUCE_ASSESSMENT_PORTABLE.md), and [data attribution](DATA_ATTRIBUTION.md). Reanalysis and physics-derived targets do not establish measured-plant accuracy or operational forecast skill. Report explicitness is not evidence of improved human decisions.
