# Instrument 06 historical pause checkpoint

Preserved on 2026-10-25 before completing the paused release.

## Resume checkpoint — Instrument 06 source integrated, release pending

This is the deliberate usage-limit pause point requested on 2026-07-29.
Private production remains the accepted Instrument 05 Sites version 15. The
Instrument 06 source below has **not** been production-built, bundle-accepted,
documented as a completed release, saved as a Sites version or deployed.

Completed in the local source tree:

- proposed ADR 0010 records the Battery & Energy-Flow scientific,
  accessibility, spatial, performance and release boundary;
- server-built `BatteryEnergyFlowFrameV1` uses the full canonical
  `OperatingSnapshot`, not the compact tuple, and preserves the linked record,
  its 24-record UTC day and reconciled annual ledger;
- a fresh canonical demand and greedy self-consumption dispatch replay checks
  all 8,760 stored flow records, PV and demand conservation, efficiency-aware
  SOC recurrence, reserve deliverability, configured bounds, exclusive
  directions, cycle throughput, summary values and provenance;
- semantic HTML reports exact one-hour energy, linked-day context, annual
  quantities, residuals, battery limits, quality, evidence IDs and eleven
  unavailable live/BMS/degradation/control layers;
- position 06 is mounted as `battery-energy-flow`, leaving six mounted
  instruments, one navigable placeholder and seven reserved positions;
- a reached-only static logical routing schematic uses one grid intertie,
  bounded SOC reservoir and linked-day route magnitudes without particles,
  physical-wiring claims, a frame loop or a second canvas;
- the I05-to-I06 camera transition follows source/bus, battery/load and grid
  context through one pure progress-derived target sweep; reduced motion uses
  the stable path without that sweep;
- the typed action opens existing workspace `BE` at the exact linked index,
  waits for acknowledgement and focuses `battery-linked-interval`;
- the unchanged application and Hero now preserve the compact canonical base
  directly; modified device-local scenarios remain explicitly disclosed
  screening branches;
- Battery and shared energy-flow labels now state `kWh / 1h`, and the linked
  day selector has one roving tab stop, Arrow/Home/End operation, 24-pixel
  minimum targets, full timestamp/SOC/import/export names and
  `aria-current="time"`.

Checkpoint evidence:

- strict TypeScript: clean;
- targeted ESLint across all I06-touched source and tests: clean;
- scientific-core tests: 11/11 passed;
- complete visual/Observatory suite through I06: 85/85 passed, including the
  26 focused Battery Energy-Flow checks;
- `git diff --check`: clean.

Required resume sequence:

1. inspect this checkpoint and rerun TypeScript plus the 85-test visual suite;
2. update the rendered-HTML/source topology and production-manifest tests for
   the I06 dynamic entry and dedicated reached-only bundle gate;
3. run the fresh production build and measure the unchanged initial spatial
   ceilings plus the I06 unique closure; optimize without raising ceilings if
   any gate fails;
4. run full repository tests, lint and smoke checks;
5. update architecture, scientific methods, limitations, performance,
   accessibility, governance, continuity and release records;
6. mark ADR 0010 Accepted only after every gate passes;
7. merge the exact validated tree into the existing private Sites source
   history, save and deploy private version 16, verify owner-only access, then
   begin Instrument 07.

