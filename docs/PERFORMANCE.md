# Performance and transport note

## Measured integration behavior

The first integrated browser pass transported the complete nested `OperatingSnapshot`—all weather, sun, irradiance, loss, flow, forecast and quality fields for 8,760 hours—through the React Server Component boundary. In the development runtime this produced response times measured in tens of seconds and eventually disconnected the client during repeated hot reloads.

The scientific calculation itself was not the failure: the integrated annual invariant test completed in about 2.4 seconds, and the full simulation API remained correct.

## Implemented correction

`lib/client-snapshot.ts` defines the versioned `sios-hour-tuple-v1` transport. It projects each canonical hour to the 14 numeric values consumed by the interactive shell:

1. GHI
2. effective POA
3. ambient temperature
4. cloud fraction
5. AC energy/power-equivalent for the one-hour interval
6. P10
7. P90
8. demand
9. battery state of charge
10. grid import
11. grid export
12. quality
13. solar elevation
14. solar azimuth

Time is reconstructed from the versioned start timestamp and one-hour interval; the array index is the canonical row index. Numeric rounding is limited to browser-display precision. The full nested, auditable 8,760-hour record remains available from `POST /api/v1/simulate` and is not replaced by the UI projection.

After this change, clean development document requests completed in approximately 2.5–3.2 seconds including deterministic construction of the full annual snapshot. Workspace interactions themselves are client-local.

## Built asset budget

The production smoke test enforces a 250 kB uncompressed budget for the workspace-specific client module. After the research-spine and linked annual-study release, the measured `SolarOperatingSystem` module is **96,890 bytes uncompressed**; the complete `dist` tree is **3,829,622 bytes (3.65 MiB)**. These values were measured from a fresh production build on 2026-07-22 and should be refreshed whenever the shell or build toolchain changes.

## Rendering strategy

- Canvas is used for the 8,760-cell Production DNA, annual chronology and orbital timeline rather than creating thousands of DOM nodes.
- Only the active workspace is mounted.
- The scientific inspector and linked cursor reuse normalized client state.
- Animations stop under `prefers-reduced-motion`.
- Fixed shell regions clip intentional instrument graphics and independently scroll analytical content.

## Remaining profiling work

- measure production HTML/RSC transfer size after the compact transport;
- record cold-start and warm-request timing in the hosted runtime;
- profile Canvas redraw cost on a mid-range mobile device;
- consider content-addressed static sample snapshots if edge cold-start CPU becomes material;
- establish performance budgets for provider ingestion, full API serialization and dataset export.
