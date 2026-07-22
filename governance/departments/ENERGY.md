# Battery, Grid, Economics & Optimisation — Department Charter

## Mission

Translate hourly solar generation into physically balanced energy flows and decision-ready system designs. The department owns battery dispatch, demand, grid import/export, curtailment, tariffs, carbon accounting, resilience scenarios and multi-objective optimisation while preserving the distinction between research simulation and operational control.

## Current truth

Maturity uses the common scale: **M0** planned only; **M1** executable prototype; **M2** deterministic and tested; **M3** independently validated against authoritative references or measured operation; **M4** operationally monitored; **M5** certified for its declared use.

- **M2 first-order dispatch:** `lib/energy/dispatch.ts` implements deterministic hourly PV-first self-consumption, battery SOC bounds, charge/discharge efficiencies and power limits, grid import/export, curtailment, tariff costs, export revenue, static carbon displacement and cycle-throughput accounting.
- **M2 supporting scenarios:** `lib/energy/demand.ts` creates deterministic residential, commercial or flat annual demand shapes; `lib/energy/units.ts` contains basic conversions. These are scenario generators, not measured demand or settlement data.
- **M1 optimisation:** `lib/optimisation/**` performs a bounded deterministic grid over tilt, azimuth, DC/AC ratio and battery capacity, five-objective Pareto filtering, seeded 240-trial multiplier Monte Carlo and four named deterministic stress cases.
- **M0:** tariff-aware predictive dispatch, battery electrochemical ageing, demand response, islanding and critical-load control, Bayesian optimisation, Sobol sensitivity, stochastic scenario trees and distributionally robust optimisation.
- The current engine assumes one-hour intervals, so charge/discharge values named in kW are numerically used as hourly kWh limits. It is not yet a general variable-interval dispatch model.
- Current financial and carbon results use configured static scenarios. They are not market settlement, investment advice or audited carbon accounts.

## Ownership boundary

- **Primary existing paths:** `lib/energy/**` and `lib/optimisation/**`.
- **Governed shared contracts:** `BatteryConfig`, `TariffConfig`, `DemandConfig`, `CarbonConfig`, `EnergyFlowHour`, `OptimisationCandidate`, `OptimisationRecord`, Monte Carlo and stress-result types in `lib/contracts/index.ts`.
- **Shared integration paths:** the energy-flow and optimisation stages in `lib/operating-snapshot.ts`; scenario configuration in `app/api/v1/simulate/route.ts` and `app/api/v1/scenarios/**`. Platform owns persistence/API mechanics; ENERGY approves calculation semantics.
- **Configuration records:** ENERGY defines scientific meaning for energy-related fields stored in `system_configurations` and `scenarios`, but does not own the whole database or access-control policy.
- **Documentation and tests:** battery, grid and optimisation portions of `docs/SCIENTIFIC_METHODS.md`, `docs/LIMITATIONS.md`, `docs/RESEARCH_ROADMAP.md` and relevant cases in `tests/science-core.test.mjs`.
- **Target paths, planned:** `lib/energy/tariffs/**`, `lib/energy/carbon/**`, `lib/energy/degradation/**`, `lib/optimisation/solvers/**`, `tests/energy/**`, `tests/optimisation/**` and `tests/fixtures/dispatch-reference/**`.
- ENERGY does not own weather truth, PV conversion physics, forecast calibration, user-interface visual design or deployment billing.

## Interfaces

- **Consumes from STAR:** interval-aligned AC generation with calculation version, nameplate, units, assumptions and uncertainty.
- **Consumes from DATA:** interval-aligned measured or scenario demand, tariffs, grid-carbon intensity, outages and telemetry with timezone, quality and provenance.
- **Consumes from FORECAST:** optional probabilistic generation/demand scenarios with issue time, valid time, lead time and calibration evidence.
- **Publishes today:** `EnergyDispatchSummary`, hourly `EnergyFlowHour[]`, `OptimisationRecord`, Pareto candidates, Monte Carlo summary and stress-scenario deltas.
- **Required target contract:** explicit interval duration, state transition, objective vector, constraint set, costs, emissions method, solver/version, random seed, input snapshot IDs, feasibility status and optimality/termination evidence.
- UI and API consumers must disclose configured prices, demand and carbon assumptions and retain `simulated` or `experimental` lifecycle status.

## Decision authority

- ENERGY decides energy-balance conventions, SOC accounting, dispatch priorities, constraint semantics, objective definitions, solver selection, Pareto dominance rules, financial formulas and carbon-accounting method versions.
- An optimiser may recommend only within declared bounds and assumptions. A weighted score cannot erase the Pareto trade-off or be called universally optimal.
- Tariff, carbon and degradation defaults require dated sources and jurisdiction. Stale assumptions may be retained for reproducibility but cannot remain the active operational default without review.
- Autonomous battery commands, grid-code compliance, protection, market bidding and investment recommendations require separate qualified authority and are outside the current product scope.
- STAR owns changes to physical generation caused by tilt, tracking and inverter sizing; ENERGY owns the optimisation experiment that requests those configurations.

## First deep-work programme

1. **Make time explicit:** add interval duration to dispatch and test hourly, half-hourly, leap-year and irregular-input rejection paths; correct kW/kWh semantics throughout.
2. **Build reference energy balances:** add hand-calculated charge, discharge, reserve, curtailment, export-limit, wraparound tariff and self-discharge fixtures plus property tests over random valid configurations.
3. **Version economics and carbon:** support time series, effective dates, currency/jurisdiction metadata, marginal-versus-average carbon methods and complete cash-flow assumptions.
4. **Add defensible battery life:** model usable-capacity fade, calendar/cycle ageing, efficiency change, replacement and salvage scenarios before optimisation claims lifetime value.
5. **Advance dispatch:** compare greedy self-consumption with tariff-aware deterministic optimisation, then forecast-aware and resilience policies under the same conservation gates.
6. **Advance optimisation carefully:** formalise bounds/costs, validate the existing grid/Pareto implementation, then add Bayesian, Sobol, scenario-tree and robust methods with solver termination and feasibility evidence.

## Definition of done

- Every interval conserves energy within a declared numerical tolerance after conversion losses; SOC, power, reserve, import/export and curtailment constraints always hold.
- Charge and discharge cannot occur simultaneously unless a future explicitly modelled market service justifies and tests it.
- Results reproduce from versioned generation, demand, tariff, carbon, battery and scenario inputs plus solver version and seed.
- Financial output itemises import cost, avoided cost, export revenue, fixed cost, capital/operating/replacement assumptions and currency; payback is never shown without its cash-flow basis.
- Carbon output identifies intensity source, time basis, export-displacement rule and embodied-carbon boundary.
- Pareto members are genuinely nondominated under the recorded objectives and tolerances; infeasible candidates never become recommendations.
- M3 requires comparison with an independent solver/reference and suitable measured dispatch or audited billing evidence for the declared scope.

## Measures

- Maximum and cumulative energy-balance residual by run and interval duration.
- SOC, power, reserve, export and curtailment constraint violations.
- Self-consumption, solar fraction, grid import/export, curtailed energy and loss breakdown.
- Battery equivalent cycles, throughput, projected degradation and replacement sensitivity when implemented.
- Revenue/cost error against reference tariff calculations and sensitivity to each financial assumption.
- Carbon result sensitivity to intensity source and export-displacement policy.
- Pareto-front size, dominated-point leakage, infeasible-candidate count and recommendation stability.
- Solver runtime, candidate count, convergence/termination status and seeded reproducibility.

## Risks and escalation

- Stop calculation and escalate on any unexplained energy imbalance, SOC violation, unit ambiguity, infeasible recommendation or tariff period misalignment.
- Escalate financial, tax, subsidy, grid-code and carbon-accounting claims for jurisdictional expert review before external decision use.
- A static demand, tariff or carbon scenario must not be presented as measured or current operational truth.
- Battery reserve is not proof of islanding capability; resilience claims require load priority, inverter topology, switching and outage constraints.
- Monte Carlo multipliers and deterministic stress cases explore assumptions but do not establish event probabilities.
- Optimisation must not issue control commands. Any future control surface requires an independently reviewed safety architecture, authorization, rollback and human override.
