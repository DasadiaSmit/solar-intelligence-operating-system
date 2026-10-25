import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { validateFrozenBundle } from '../../lib/research/frozen-bundle.js';
import { assertAssessmentSources } from '../../lib/research/assessment-source.js';
import { buildReferenceInputs } from '../../lib/research/reference-export.js';

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) throw new Error('Usage: export-reference-inputs.mts STUDY01_EVIDENCE_DIRECTORY NEW_OUTPUT_DIRECTORY');
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(), '', 'Commit source changes before export');
const input = resolve(inputArg), output = resolve(outputArg);
const hash = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');
const manifestBytes = await readFile(join(input, 'manifest.json'));
const originalManifest = JSON.parse(manifestBytes.toString());
assert.equal(originalManifest.schema, 'sios-assessment-evidence-1');
const names = new Set<string>();
for (const file of originalManifest.files) {
  assert.equal(basename(file.path), file.path, 'Manifest must contain only local filenames');
  assert.ok(!names.has(file.path), 'No duplicate manifest entries'); names.add(file.path);
  const bytes = await readFile(join(input, file.path));
  assert.equal(bytes.length, file.bytes); assert.equal(hash(bytes), file.sha256, `Input hash: ${file.path}`);
}
for (const name of ['frozen-bundle.json.gz', 'audit.json', 'baseline-study-replay.json']) assert.ok(names.has(name));
globalThis.fetch = async () => { throw new Error('Network disabled for frozen reference export'); };
const compressed = await readFile(join(input, 'frozen-bundle.json.gz'));
const { config, archive } = await validateFrozenBundle(JSON.parse(gunzipSync(compressed).toString()));
assertAssessmentSources({ mode: 'live' }, archive);
const payload = buildReferenceInputs(config, archive);
assert.equal(config.array.capacityKwDc, payload.protocol.controlledConfiguration.capacityKwDc);
assert.equal(config.array.dcAcRatio, payload.protocol.controlledConfiguration.dcAcRatio);
assert.equal(config.array.tiltDeg, payload.protocol.controlledConfiguration.baselineTiltDeg);
assert.equal(config.array.azimuthDeg, payload.protocol.controlledConfiguration.baselineAzimuthDeg);
assert.equal(config.array.inverterEfficiency, payload.protocol.controlledConfiguration.inverterEfficiency);
assert.equal(config.array.temperatureCoefficientPerC, -0.0034, 'Protocol02 fixes the PVWatts temperature coefficient');
const originalAudit = JSON.parse(await readFile(join(input, 'audit.json'), 'utf8'));
for (const c of payload.cases) {
  assert.equal(c.rows.length, 8760);
  const expected = c.id === 'representative-2026' ? originalAudit.variants[0].annualKWh : originalAudit.historical.find((h: {year: number}) => String(h.year) === c.id).annualKWh;
  assert.equal(c.originalAnnualKWh, expected, 'Native unmodified case must reconcile to saved study01');
}
const protocolBytes = await readFile(new URL('../../docs/research/assessment-protocol-02.json', import.meta.url));
assert.deepEqual(payload.protocol, JSON.parse(protocolBytes.toString()));
await mkdir(output, { recursive: false });
const outputs = [
  { path: 'inputs.json.gz', bytes: gzipSync(JSON.stringify(payload)) },
  { path: 'protocol.json', bytes: protocolBytes },
];
for (const f of outputs) await writeFile(join(output, f.path), f.bytes, { flag: 'wx' });
await writeFile(join(output, 'manifest.json'), JSON.stringify({
  schema: payload.schema, generatedAtUtc: new Date().toISOString(), sourceCommit,
  sourceStudyManifestSha256: hash(manifestBytes), sourceFrozenBundleGzipSha256: hash(compressed),
  protocolSha256: hash(protocolBytes), sourceStudyCommit: originalManifest.sourceCommit,
  originalAnnualTotalsReconciled: true, networkDisabled: true,
  units: 'Irradiance W/m2; temperature C; power kW. Each exported hourly mean power integrated over1hour has the same numeric kWh value. UTC timestamps are existing interval midpoints; do not shift again.',
  diagnosticScope: 'Controlled monofacial no-extra-loss copies; original bifacial inputs and results preserved separately.',
  files: outputs.map(f => ({ path: f.path, bytes: f.bytes.length, sha256: hash(f.bytes) })),
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, sourceCommit, cases: payload.cases.length, hourlyRows: payload.cases.reduce((n, c) => n + c.rows.length, 0), arrayCases: payload.arrayCases.length }));
