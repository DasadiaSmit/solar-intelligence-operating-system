**Arithmetic test fixture C08: Missing omission results. These are hand-defined verification values, not physics-generated research data. Production formatter wording below is test output, not fixture provenance. Equal monthly splits and zero seam values, where displayed, are test scaffolding outside the scored questions.**

Scope: finite tested scenarios and modelled/synthetic evidence. No measured production, future probability or human decision-quality improvement is established.

# Solar decision evidence report

Report version: decision-evidence-report-2.0.0.

Source: Hand-defined arithmetic fixture; no PV simulation

Provenance supplied with the evidence: Known case C08, exploratory rerun after primary results; not an independent validation set.

Scope: finite tested scenarios and modelled/synthetic evidence. No measured production, future probability or human decision-quality improvement is established.

This report checks the supplied arithmetic and completeness. It does not independently authenticate the source or validate a physical model.

## Evidence coverage

Available historical scenarios: **4 / 4**. Missing historical cells: **0**.
Complete historical scenarios: **4 / 4**. Available counts refer to present rows; present rows with missing cells are not complete scenarios.
Expected scenario identifiers: 2022, 2023, 2024, 2025.

## Nominal estimate and finite-scenario choice

Nominal representative-year winner(s): **A**.
Minimax-regret winner(s) across the 4 expected scenarios: **B**.
Within the 4 tested scenarios, switching from the nominal rule to the minimax-regret rule reduces worst-case regret by 60–60 kWh (range covers nominal ties). This is an in-scenario comparison, not evidence of future performance.
There are **1** option pairs whose relative order reverses between historical scenarios. Winner counts describe this finite set, not probabilities.

Ties within 0.000001 kWh are retained. Regret is each scenario’s highest yield minus an option’s yield; the robust rule minimises the maximum of those regrets.

| Option | Nominal annual kWh | Difference from nominal maximum (%) | Worst historical regret (kWh) | Historical winner count |
| --- | ---: | ---: | ---: | ---: |
| A | 100 | 0 | 70 | 2 / 4 |
| B | 90 | -10 | 10 | 2 / 4 |

Relative percentages are undefined when the nominal maximum is zero or unavailable; they are not replaced with zero.

### Nominal yield sacrificed by each robust option

Sacrifice is the highest nominal yield minus the selected option’s nominal yield. It is distinct from regret reduction.

| Robust option | Nominal sacrifice (kWh) |
| --- | ---: |
| B | 10 |

## Source-omission sensitivity

Sensitivity range unavailable: 0 / 4 omission results are available. Every expected omission must be present to report the range.
Missing omission cases: omit-2022, omit-2023, omit-2024, omit-2025.

| Omission case | Annual kWh |
| --- | ---: |
| omit-2022 | missing |
| omit-2023 | missing |
| omit-2024 | missing |
| omit-2025 | missing |

Omission results describe sensitivity, not a confidence interval. The series is interpreted as one reference configuration described by the supplied provenance; this report does not verify that assumption. Its range is not an uncertainty bound for every candidate.

## Raw historical evidence

| Historical scenario | A | B |
| --- | ---: | ---: |
| 2022 | 100 | 90 |
| 2023 | 10 | 80 |
| 2024 | 110 | 100 |
| 2025 | 20 | 75 |

All energy values are in kWh. Missing rows and cells remain missing; no zero filling or scenario substitution is performed.
