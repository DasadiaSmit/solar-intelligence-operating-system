**Arithmetic test fixture C07: Missing historical value. These are hand-defined verification values, not physics-generated research data. Production formatter wording below is test output, not fixture provenance. Equal monthly splits and zero seam values, where displayed, are test scaffolding outside the scored questions.**

Scope: finite tested scenarios and modelled/synthetic evidence. No measured production, future probability or human decision-quality improvement is established.

# Solar decision evidence report

Report version: decision-evidence-report-2.0.0.

Source: Hand-defined arithmetic fixture; no PV simulation

Provenance supplied with the evidence: Known case C07, exploratory rerun after primary results; not an independent validation set.

Scope: finite tested scenarios and modelled/synthetic evidence. No measured production, future probability or human decision-quality improvement is established.

This report checks the supplied arithmetic and completeness. It does not independently authenticate the source or validate a physical model.

## Evidence coverage

Available historical scenarios: **4 / 4**. Missing historical cells: **1**. Missing locations: 2023 / B.
Complete historical scenarios: **3 / 4**. Available counts refer to present rows; present rows with missing cells are not complete scenarios.
Expected scenario identifiers: 2022, 2023, 2024, 2025.

## Nominal estimate and finite-scenario choice

Nominal representative-year winner(s): **A**.
Minimax-regret choice, ranking reversals, regret reduction and nominal sacrifice are withheld until every expected historical cell and nominal value is available. A cached result cannot fill missing evidence.

Ties within 0.000001 kWh are retained. Regret is each scenario’s highest yield minus an option’s yield; the robust rule minimises the maximum of those regrets.

| Option | Nominal annual kWh | Difference from nominal maximum (%) |
| --- | ---: | ---: |
| A | 100 | 0 |
| B | 90 | -10 |

Relative percentages are undefined when the nominal maximum is zero or unavailable; they are not replaced with zero.

## Source-omission sensitivity

Sensitivity range: **95–105 kWh**. This is a sensitivity range, not a confidence interval.

| Omission case | Annual kWh |
| --- | ---: |
| omit-2022 | 95 |
| omit-2023 | 98 |
| omit-2024 | 102 |
| omit-2025 | 105 |

Omission results describe sensitivity, not a confidence interval. The series is interpreted as one reference configuration described by the supplied provenance; this report does not verify that assumption. Its range is not an uncertainty bound for every candidate.

## Raw historical evidence

| Historical scenario | A | B |
| --- | ---: | ---: |
| 2022 | 100 | 90 |
| 2023 | 80 | missing |
| 2024 | 110 | 100 |
| 2025 | 90 | 80 |

All energy values are in kWh. Missing rows and cells remain missing; no zero filling or scenario substitution is performed.
