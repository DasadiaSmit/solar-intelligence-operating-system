# Solar decision evidence report

Report version: decision-evidence-report-2.0.0.

Source: ERA5 historical reanalysis with physics-derived production; study\_22b6b34d1cf9f34dbfbc68ee

Provenance supplied with the evidence: Previously inspected Sheffield 48 kWp study 01; original evidence and model remain unchanged. Omission range concerns the original baseline configuration; option nominal yields concern the nine-option comparison. Open-Meteo / ECMWF ERA5 attribution: https://open-meteo.com/en/licence . Raw weather transformations, configuration, monthly diagnostics and model limitations remain in the original frozen study report. This is a transfer example, not a new PV experiment or independent holdout.

Scope: finite tested scenarios and modelled/synthetic evidence. No measured production, future probability or human decision-quality improvement is established.

This report checks the supplied arithmetic and completeness. It does not independently authenticate the source or validate a physical model.

## Evidence coverage

Available historical scenarios: **4 / 4**. Missing historical cells: **0**.
Complete historical scenarios: **4 / 4**. Available counts refer to present rows; present rows with missing cells are not complete scenarios.
Expected scenario identifiers: 2022, 2023, 2024, 2025.

**Evidence warning:** Cached recommendation agrees with the recomputed result; the report still uses raw evidence.

## Nominal estimate and finite-scenario choice

Nominal representative-year winner(s): **tilt-42_azimuth-180**.
Minimax-regret winner(s) across the 4 expected scenarios: **tilt-42_azimuth-180**.
The robust rule does not reduce worst-case regret for the nominal choice in this tested set. This is a zero-benefit result, not evidence of improvement.
There are **3** option pairs whose relative order reverses between historical scenarios. Winner counts describe this finite set, not probabilities.

Ties within 0.000001 kWh are retained. Regret is each scenario’s highest yield minus an option’s yield; the robust rule minimises the maximum of those regrets.

| Option | Nominal annual kWh | Difference from nominal maximum (%) | Worst historical regret (kWh) | Historical winner count |
| --- | ---: | ---: | ---: | ---: |
| tilt-22_azimuth-162 | 47,813.492092 | -3.629443 | 2,310.279667 | 0 / 4 |
| tilt-22_azimuth-180 | 47,976.598996 | -3.300693 | 2,153.758068 | 0 / 4 |
| tilt-22_azimuth-198 | 47,547.081949 | -4.166406 | 2,678.233624 | 0 / 4 |
| tilt-32_azimuth-162 | 49,062.888837 | -1.111219 | 759.379078 | 0 / 4 |
| tilt-32_azimuth-180 | 49,248.559426 | -0.736991 | 581.292782 | 0 / 4 |
| tilt-32_azimuth-198 | 48,686.054287 | -1.870749 | 1,284.435619 | 0 / 4 |
| tilt-42_azimuth-162 | 49,383.296784 | -0.465421 | 465.703119 | 0 / 4 |
| tilt-42_azimuth-180 | 49,614.211627 | 0 | 0 | 4 / 4 |
| tilt-42_azimuth-198 | 48,956.088521 | -1.326481 | 830.969627 | 0 / 4 |

Relative percentages are undefined when the nominal maximum is zero or unavailable; they are not replaced with zero.

### Nominal yield sacrificed by each robust option

Sacrifice is the highest nominal yield minus the selected option’s nominal yield. It is distinct from regret reduction.

| Robust option | Nominal sacrifice (kWh) |
| --- | ---: |
| tilt-42_azimuth-180 | 0 |

## Source-omission sensitivity

Sensitivity range: **47,150.226926–51,936.450686 kWh**. This is a sensitivity range, not a confidence interval.

| Omission case | Annual kWh |
| --- | ---: |
| omit-2022 | 48,604.319374 |
| omit-2023 | 49,986.310731 |
| omit-2024 | 51,936.450686 |
| omit-2025 | 47,150.226926 |

Omission results describe sensitivity, not a confidence interval. The series is interpreted as one reference configuration described by the supplied provenance; this report does not verify that assumption. Its range is not an uncertainty bound for every candidate.

## Raw historical evidence

| Historical scenario | tilt-22_azimuth-162 | tilt-22_azimuth-180 | tilt-22_azimuth-198 | tilt-32_azimuth-162 | tilt-32_azimuth-180 | tilt-32_azimuth-198 | tilt-42_azimuth-162 | tilt-42_azimuth-180 | tilt-42_azimuth-198 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2022 | 50,440.756876 | 50,597.278475 | 50,072.802919 | 51,991.657465 | 52,169.743761 | 51,466.600924 | 52,533.707108 | 52,751.036543 | 51,920.066916 |
| 2023 | 47,980.859842 | 48,279.792715 | 47,972.3434 | 49,188.557303 | 49,563.10074 | 49,166.747625 | 49,463.779472 | 49,929.482591 | 49,469.094188 |
| 2024 | 44,481.454502 | 44,562.184477 | 44,117.57065 | 45,585.672219 | 45,660.76931 | 45,065.497986 | 45,859.607103 | 45,941.380184 | 45,246.748072 |
| 2025 | 51,562.152215 | 51,797.815954 | 51,367.289628 | 52,971.342842 | 53,252.296678 | 52,685.826669 | 53,347.671717 | 53,672.900466 | 53,016.759246 |

All energy values are in kWh. Missing rows and cells remain missing; no zero filling or scenario substitution is performed.
