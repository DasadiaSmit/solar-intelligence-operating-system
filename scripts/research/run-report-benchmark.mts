import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { buildPointReport, buildTableReport, buildExistingEvidenceExample } from '../../lib/research/report-benchmark.js';
import { buildDecisionReport } from '../../lib/research/decision-report.js';

const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) throw new Error('Usage: run-report-benchmark.mts STUDY01_EVIDENCE_DIRECTORY NEW_OUTPUT_DIRECTORY');
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(), '', 'Commit source before issuing benchmark results');
const baselineCommit = '0dde63d2643514127e4383bfd6da9e69f91a03b4';
const baselineRenderer = execFileSync('git', ['show', `${baselineCommit}:lib/research/decision-report.ts`]);
const renderer = await readFile(new URL('../../lib/research/decision-report.ts', import.meta.url));
assert.ok(renderer.equals(baselineRenderer), 'Primary renderer must remain unchanged');
const hash = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');
const protocolBytes = await readFile(new URL('../../docs/research/assessment-protocol-03.json', import.meta.url));
const protocol = JSON.parse(protocolBytes.toString());
assert.equal(protocol.id, 'report-information-evaluation-03');
globalThis.fetch = async () => { throw new Error('Network disabled during report benchmark'); };
const source = resolve(sourceArg), output = resolve(outputArg);
const originalManifestBytes = await readFile(join(source, 'manifest.json'));
const originalManifest = JSON.parse(originalManifestBytes.toString());
for (const name of ['audit.json', 'baseline-study-replay.json', 'REPORT.md']) {
  const entry = originalManifest.files.find((file: { path: string }) => file.path === name);
  assert.ok(entry, `Missing source manifest entry: ${name}`);
  assert.equal(hash(await readFile(join(source, name))), entry.sha256);
}
await mkdir(output, { recursive: false });
const json = (name: string, data: unknown) => writeFile(join(output, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
await writeFile(join(output, 'protocol.json'), protocolBytes, { flag: 'wx' });
await json('cases.json', protocol.cases);
const status: Record<string, Record<string, { status: string; error?: string }>> = {};
for (const c of protocol.cases) {
  const folder = join(output, 'reports', c.id); await mkdir(folder, { recursive: true });
  status[c.id] = {};
  for (const [condition, build] of Object.entries({ point: buildPointReport, tables: buildTableReport, 'evidence-v1': buildExistingEvidenceExample })) {
    try {
      const markdown = build(c);
      await writeFile(join(folder, `${condition}.md`), markdown, { flag: 'wx' });
      status[c.id][condition] = { status: 'generated' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      status[c.id][condition] = { status: 'generation-rejected', error: message };
      await writeFile(join(folder, `${condition}.md`), `# Generation rejected\n\nFixture ${c.id}; condition ${condition}.\n\nThe normal producer rejected this input before a report was produced: ${message}\n\nThis is a benchmark status record, not a generated evidence report.\n`, { flag: 'wx' });
    }
  }
}
await json('run-status.json', status);
const originalStudy = JSON.parse(await readFile(join(source, 'baseline-study-replay.json'), 'utf8'));
const originalAudit = JSON.parse(await readFile(join(source, 'audit.json'), 'utf8'));
const transfer = buildDecisionReport(originalStudy, originalAudit);
assert.equal(transfer, await readFile(join(source, 'REPORT.md'), 'utf8'), 'Previously inspected Sheffield report must reproduce exactly');
await mkdir(join(output, 'transfer'));
await writeFile(join(output, 'transfer', 'sheffield-evidence-v1.md'), transfer, { flag: 'wx' });
await json('source-metadata.json', { sourceCommit, baselineRendererCommit: baselineCommit, baselineRendererSha256: hash(renderer), protocolSha256: hash(protocolBytes), sourceStudyManifestSha256: hash(originalManifestBytes), primarySourceUnchanged: true, transferReportByteIdentical: true, fetchDisabled: true, noNetworkRequired: true, interpretation: 'Predeclared known-answer software information benchmark; no participants or new PV experiments. Incomplete and direct renderer stress cases are separate from six complete primary cases.' });
async function inventory(folder: string): Promise<Array<{ path: string; sha256: string; bytes: number }>> {
  const files = [];
  for (const entry of (await readdir(folder, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(folder, entry.name);
    if (entry.isDirectory()) files.push(...await inventory(full));
    else { const bytes = await readFile(full); files.push({ path: relative(output, full), sha256: hash(bytes), bytes: bytes.length }); }
  }
  return files;
}
await json('manifest.json', { schema: 'sios-report-benchmark-1', sourceCommit, protocolSha256: hash(protocolBytes), files: await inventory(output) });
console.log(JSON.stringify({ output, cases: protocol.cases.length, primaryCases: protocol.primaryCases.length, conditions: 3, sourceCommit }));
