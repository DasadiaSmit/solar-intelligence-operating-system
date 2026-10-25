import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { buildDecisionEvidenceReport } from '../../lib/research/decision-evidence-report.js';
import { fixtureNotice, type ReportBenchmarkCase } from '../../lib/research/report-benchmark.js';

const [primaryArg, studyArg, outputArg] = process.argv.slice(2);
if (!primaryArg || !studyArg || !outputArg) throw new Error('Usage: run-report-exploration.mts PRIMARY_BUNDLE STUDY01_ANALYSIS NEW_OUTPUT');
assert.equal(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(), '', 'Commit source before exploratory results');
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const primary = resolve(primaryArg), studyFolder = resolve(studyArg), output = resolve(outputArg);
const hash = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');
const primaryManifestBytes = await readFile(join(primary, 'manifest.json'));
const manifest = JSON.parse(primaryManifestBytes.toString());
assert.equal(manifest.schema, 'sios-report-benchmark-1');
for (const file of manifest.files) {
  assert.ok(!isAbsolute(file.path) && !file.path.split('/').includes('..'));
  const data = await readFile(join(primary, file.path));
  assert.equal(hash(data), file.sha256); assert.equal(data.length, file.bytes);
}
const protocolBytes = await readFile(join(primary, 'protocol.json'));
assert.ok(protocolBytes.equals(await readFile(new URL('../../docs/research/assessment-protocol-03.json', import.meta.url))));
const protocol = JSON.parse(protocolBytes.toString());
const originalStatus = JSON.parse(await readFile(join(primary, 'run-status.json'), 'utf8'));
const sourceStudyManifestBytes = await readFile(join(studyFolder, 'manifest.json'));
const sourceStudyManifest = JSON.parse(sourceStudyManifestBytes.toString());
for (const name of ['audit.json', 'baseline-study-replay.json']) {
  const file = sourceStudyManifest.files.find((entry: { path: string }) => entry.path === name);
  assert.ok(file); assert.equal(hash(await readFile(join(studyFolder, name))), file.sha256);
}
globalThis.fetch = async () => { throw new Error('Fetch disabled during exploratory report generation'); };
await mkdir(output, { recursive: false });
for (const file of manifest.files) {
  if (['run-status.json', 'source-metadata.json'].includes(file.path)) continue;
  await mkdir(resolve(join(output, file.path), '..'), { recursive: true });
  await copyFile(join(primary, file.path), join(output, file.path));
}
const json = (name: string, data: unknown) => writeFile(join(output, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const statuses = structuredClone(originalStatus);
for (const c of protocol.cases as ReportBenchmarkCase[]) {
  let markdown: string;
  try {
    markdown = fixtureNotice(c) + buildDecisionEvidenceReport({
      candidateIds: c.candidateIds, nominalKWh: c.nominalKWh, historicalCases: c.historicalCases,
      omittedAnnualKWh: c.omittedAnnualKWh, expectedScenarioIds: ['2022', '2023', '2024', '2025'],
      source: 'Hand-defined arithmetic fixture; no PV simulation', provenance: `Known case ${c.id}, exploratory rerun after primary results; not an independent validation set.`,
      cachedRobustWinnerIds: c.tamper?.robustWinnerIds,
    });
    statuses[c.id]['evidence-v2'] = { status: 'generated' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    statuses[c.id]['evidence-v2'] = { status: 'generation-rejected', error: message };
    markdown = `# Generation did not complete\n\n${message}\n\nThis is a status record, not an evidence report.\n`;
  }
  // Filesystem errors must propagate; they are not safe input refusals.
  await writeFile(join(output, 'reports', c.id, 'evidence-v2.md'), markdown, { flag: 'wx' });
}
const audit = JSON.parse(await readFile(join(studyFolder, 'audit.json'), 'utf8'));
const study = JSON.parse(await readFile(join(studyFolder, 'baseline-study-replay.json'), 'utf8'));
const expected = ['2022', '2023', '2024', '2025'];
const realReport = buildDecisionEvidenceReport({
  candidateIds: audit.candidates.map((row: { id: string }) => row.id),
  nominalKWh: audit.nominal.map((row: { annualKWh: number }) => row.annualKWh),
  historicalCases: audit.historicalCases.map((row: { id: string; rows: Array<{ annualKWh: number }> }) => ({ id: row.id, annualKWh: row.rows.map(v => v.annualKWh) })),
  omittedAnnualKWh: expected.map(id => audit.variants.find((row: { id: string }) => row.id === `omit-${id}`)?.annualKWh ?? null),
  expectedScenarioIds: expected, source: `ERA5 historical reanalysis with physics-derived production; ${study.studyId}`,
  provenance: 'Previously inspected Sheffield 48 kWp study 01; original evidence and model remain unchanged. Omission range concerns the original baseline configuration; option nominal yields concern the nine-option comparison. Open-Meteo / ECMWF ERA5 attribution: https://open-meteo.com/en/licence . Raw weather transformations, configuration, monthly diagnostics and model limitations remain in the original frozen study report. This is a transfer example, not a new PV experiment or independent holdout.',
  cachedRobustWinnerIds: audit.choice.robustWinnerIds,
});
await writeFile(join(output, 'transfer', 'sheffield-evidence-v2.md'), realReport, { flag: 'wx' });
await json('run-status.json', statuses);
await json('source-metadata.json', { sourceCommit, protocolSha256: hash(protocolBytes), primarySourceCommit: manifest.sourceCommit,
  primaryManifestSha256: hash(primaryManifestBytes), sourceStudyManifestSha256: hash(sourceStudyManifestBytes),
  runKind: 'exploratory-same-case-regression', fetchDisabled: true, noNetworkRequired: true,
  primaryReportsCopiedWithoutModification: true, independentValidation: false });
async function inventory(folder: string): Promise<Array<{ path: string; sha256: string; bytes: number }>> {
  const files = [];
  for (const entry of (await readdir(folder, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(folder, entry.name);
    if (entry.isDirectory()) files.push(...await inventory(full));
    else { const data = await readFile(full); files.push({ path: relative(output, full), sha256: hash(data), bytes: data.length }); }
  }
  return files;
}
await json('manifest.json', { schema: 'sios-report-benchmark-1', runKind: 'exploratory-same-case-regression', sourceCommit,
  protocolSha256: hash(protocolBytes), primaryManifestSha256: hash(primaryManifestBytes), files: await inventory(output) });
console.log(JSON.stringify({ output, sourceCommit, runKind: 'exploratory-same-case-regression' }));
