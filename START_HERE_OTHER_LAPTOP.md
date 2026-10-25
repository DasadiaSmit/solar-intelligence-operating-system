# Current portable assessment package

For the current version 20 source and frozen research, start with [RUN_ME.md](RUN_ME.md). It replaces the older machine recovery instructions below for assessment-package use.

# 2258357 Final Project — Setup on Another Laptop

This archive contains the complete portable source for the **Solar Intelligence Operating System** research prototype, documentation, tests, migrations and presentation deliverables.

The archive intentionally does **not** contain installed dependencies, build caches, machine-specific files, Git history or private environment files. Those files are regenerated safely on the destination laptop.

## Required software

### 1. Node.js

- Required version: **Node.js 22.13.0 or newer within the Node 22 line**.
- Recommended: current Node.js 22 LTS release.
- Download: <https://nodejs.org/>

Confirm installation:

```bash
node --version
```

The result must be `v22.13.0` or newer.

### 2. pnpm

- Project package manager: **pnpm 11.9.0**.
- Recommended installation through Corepack, which is supplied with Node.js.

macOS, Linux, Windows PowerShell or Windows Terminal:

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm --version
```

The final command should report `11.9.0`.

If `corepack` is unavailable, install pnpm 11 using the official instructions: <https://pnpm.io/installation>

### 3. Modern web browser

Use a current version of one of the following:

- Google Chrome — recommended for demonstration and development.
- Microsoft Edge.
- Firefox.
- Safari on macOS.

JavaScript, WebGL and local storage must be enabled.

### 4. Internet connection

Internet access is required initially to download npm packages with `pnpm install`.

After installation, the deterministic sample mode is offline-capable. Internet access is still needed when requesting live Open-Meteo/ERA5 or PVGIS data.

## Optional software

- **Visual Studio Code** for reading and editing the source: <https://code.visualstudio.com/>
- **Git** for version control and GitHub synchronisation: <https://git-scm.com/downloads>
- **Microsoft PowerPoint** to edit the supplied `.pptx`. PowerPoint for the web, LibreOffice Impress or Apple Keynote can open it, but PowerPoint provides the best fidelity.
- A ZIP extraction tool. Windows and macOS already provide one.

Python, Docker, PostgreSQL and a locally installed database are **not required** for sample-mode operation.

## First-time installation

### macOS

1. Double-click `2258357_FP.zip` to extract it.
2. Open Terminal.
3. Enter `cd `, including the space, drag the extracted `2258357_FP` folder into Terminal, and press Return.
4. Run:

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

5. Open <http://localhost:3000/> in Chrome.

### Windows 10 or 11

1. Right-click `2258357_FP.zip` and choose **Extract All**.
2. Open the extracted `2258357_FP` folder.
3. Right-click inside the folder and choose **Open in Terminal**.
4. Run:

```powershell
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

5. Open <http://localhost:3000/> in Chrome or Edge.

### Linux

1. Extract the archive.
2. Open a terminal in the extracted `2258357_FP` directory.
3. Run:

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

4. Open <http://localhost:3000/>.

## Normal startup after the first installation

Open a terminal in the project folder and run:

```bash
pnpm dev
```

Then visit <http://localhost:3000/>.

Stop the development server with `Control + C` in the terminal.

## Environment configuration

No API key or database is required for deterministic sample mode.

The application already includes `.env.example`. Only create `.env.local` when changing provider policy or another documented setting.

macOS or Linux:

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Do not add passwords, API keys or credentials to source-controlled files. `.env.local` is excluded from the portable archive.

Useful provider settings:

- `SOLAR_PROVIDER_MODE=auto` — try live public data and permit the configured fallback.
- `SOLAR_PROVIDER_MODE=sample` — force the deterministic offline demonstration.
- `SOLAR_ALLOW_SIMULATED_FALLBACK=true` — permit clearly labelled sample fallback if a live provider fails.

## Verify the transferred project

Run the complete validation suite:

```bash
pnpm test
```

Run individual checks when diagnosing a problem:

```bash
pnpm lint
pnpm build
pnpm test:science
pnpm test:research
pnpm test:mission
pnpm test:smoke
```

The health endpoint is available while the prototype is running:

<http://localhost:3000/api/v1/health>

## Presentation

The completed presentation is under `outputs/`:

- `Solar_Intelligence_Operating_System_Research_Presentation.pptx`

## Database and deployment components

Local sample mode does not require a database.

The source includes:

- Drizzle schema under `db/`.
- SQL migrations under `drizzle/`.
- Cloudflare/Sites binding declarations under `.openai/hosting.json`.
- Worker code under `worker/`.

Hosted deployment can use Cloudflare D1 for structured records and R2 for snapshots. Those hosted services and credentials are not required to run the local prototype and are not included in the archive.

## Common problems

### `pnpm` is not recognised

Close and reopen the terminal after installing Node.js, then run:

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
```

### The application does not open at port 3000

Read the terminal output. If port 3000 is already occupied, stop the other local server or use the alternative URL printed by the development command.

### Live weather or reanalysis fails

The provider may be unavailable, rate-limited or blocked by the network. Use deterministic sample mode:

1. Copy `.env.example` to `.env.local`.
2. Set `SOLAR_PROVIDER_MODE=sample`.
3. Restart `pnpm dev`.

### Installation behaves inconsistently

Confirm the versions first:

```bash
node --version
pnpm --version
```

Use Node 22.13+ and pnpm 11.9.0, then run `pnpm install --frozen-lockfile` again.

## Scientific interpretation warning

The application provides estimated, simulated and experimental results. It does not guarantee production. Sample-mode figures are not measured plant output, and historical ERA5 reanalysis is not an issue-time operational forecast. Read `docs/LIMITATIONS.md`, `docs/SCIENTIFIC_METHODS.md` and `docs/MODEL_VALIDATION.md` before presenting quantitative results.
