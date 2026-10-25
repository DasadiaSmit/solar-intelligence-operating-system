# Equal-information tables — C05

**Arithmetic test fixture C05: Robust tie; one option sacrifices nominal yield. These are hand-defined verification values, not physics-generated research data. Production formatter wording below is test output, not fixture provenance. Equal monthly splits and zero seam values, where displayed, are test scaffolding outside the scored questions.**

Scope: finite tested scenarios and modelled/synthetic evidence. No measured production, future probability or human decision-quality improvement is established.


Available historical scenarios: **4 / 4**. Missing historical cells: **0**.

| Option | Nominal annual kWh |
| --- | ---: |
| A | 105.00 |
| B | 100.00 |

| Historical scenario | A | B |
| --- | ---: | ---: |
| 2022 | 100.00 | 90.00 |
| 2023 | 80.00 | 90.00 |
| 2024 | 110.00 | 100.00 |
| 2025 | 90.00 | 100.00 |

Omission results describe sensitivity, not a confidence interval.
| Omission case | Annual kWh |
| --- | ---: |
| omit-2022 | 100.00 |
| omit-2023 | 103.00 |
| omit-2024 | 105.00 |
| omit-2025 | 107.00 |

The decision rule is minimum worst-case energy regret over the four scenarios. Regret means each row’s best energy minus an option’s energy. Nominal sacrifice means the best nominal energy minus a selected option’s nominal energy. All ties within 0.000001 kWh must be retained.
