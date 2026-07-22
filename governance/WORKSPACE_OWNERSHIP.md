# Workspace ownership

Every workspace has one accountable domain department. `FEATURES` owns the shared application workflow and `EXPERIENCE` owns interaction quality, but neither may redefine domain calculations.

| ID | Workspace | Accountable department | Required contributors |
| --- | --- | --- | --- |
| DT | Solar Digital Twin Operations | TWIN | EXPERIENCE, SOLAR, DATA, ENERGY, FEATURES |
| AF | Annual Energy Forecast Observatory | FORECAST | DATA, SOLAR, RESEARCH, EXPERIENCE, FEATURES |
| WA | Weather & Atmosphere Command Centre | DATA | FORECAST, TWIN, EXPERIENCE, FEATURES |
| ML | Forecast Model Laboratory | FORECAST | DATA, RESEARCH, PLATFORM, FEATURES |
| RV | Forecast Replay & Validation Centre | FORECAST | DATA, RESEARCH, QA, FEATURES |
| AE | Solar Array Engineering Studio | SOLAR | TWIN, ENERGY, EXPERIENCE, FEATURES |
| SR | Scenario & Resilience Simulator | ENERGY | SOLAR, DATA, FORECAST, QA, FEATURES |
| BE | Battery & Energy-Flow Optimisation | ENERGY | SOLAR, EXPERIENCE, FEATURES |
| RM | Regional Solar Intelligence Map | TWIN | DATA, SOLAR, EXPERIENCE, FEATURES |
| CL | Climate & Long-Horizon Analysis | RESEARCH | DATA, FORECAST, SOLAR, FEATURES |
| FI | Financial & Investment Observatory | ENERGY | RESEARCH, QA, FEATURES, EXPERIENCE |
| PA | Data Provenance & Scientific Audit | DATA | PLATFORM, RESEARCH, SECOPS, QA, FEATURES |
| RP | Research Publication Studio | RESEARCH | DATA, FORECAST, EXPERIENCE, FEATURES |
| MC | Executive Mission Control | FEATURES | EXPERIENCE and every contributing domain |

## Accountability rules

- The accountable department owns the domain meaning, failure modes and lifecycle boundary.
- `FEATURES` owns navigation, linked state and workflow completion.
- `EXPERIENCE` owns accessibility, visual hierarchy, responsive behavior and input ergonomics.
- `QA` can block a claim or release when evidence is incomplete.
- `ARCH` resolves contract conflicts and breaking-boundary decisions.
- `SECOPS` can block a release for unresolved critical security or recovery risk.
- Mission Intelligence Core is not a fifteenth workspace. It is the cross-cutting cognitive subsystem over approved evidence-carrying tools, linked object state and scientific memory; domain departments retain authority over their calculations.

The JSON registry is canonical when this table and machine-readable data disagree.
