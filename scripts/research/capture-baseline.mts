import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { DEFAULT_SYSTEM_CONFIG } from '../../lib/sample/defaults.js';
import { loadHistoricalWeatherArchive } from '../../lib/research/historical-weather.js';
import { buildAnnualResearchStudyFromArchive } from '../../lib/research/annual-study.js';

const out = process.argv[2];
const mode = process.argv[3] ?? 'live';
if (!out || !['sample', 'live'].includes(mode)) throw new Error('Usage: capture-baseline.mts NEW_OUTPUT_DIRECTORY [live|sample]');
const output = resolve(out);
await mkdir(output, { recursive: false });
const startedAt = new Date().toISOString();
const protocol = await readFile('docs/research/assessment-protocol-01.json');
const hash = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');
await writeFile(join(output, 'protocol.json'), protocol, { flag: 'wx' });
const config = structuredClone(DEFAULT_SYSTEM_CONFIG);
await writeFile(join(output, 'configuration.json'), JSON.stringify(config, null, 2)+'\n', { flag: 'wx' });
const capture = { schema: 'sios-frozen-baseline-1', startedAt, mode, sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim(), protocolSha256: hash(protocol), attribution: 'Open-Meteo / ECMWF ERA5; see https://open-meteo.com/en/docs/historical-weather-api and source provenance. Sample mode is simulated proving data.' };
await writeFile(join(output, 'capture-start.json'), JSON.stringify(capture,null,2)+'\n', {flag:'wx'});
try {
 const archive = await loadHistoricalWeatherArchive(config.location, {mode: mode as 'live'|'sample', bypassCache: true, env:{SOLAR_PROVIDER_MODE:mode, SOLAR_ALLOW_SIMULATED_FALLBACK:'false', OPEN_METEO_REANALYSIS_MODEL:'era5'}});
 const archiveBytes = Buffer.from(JSON.stringify(archive));
 const compressed = gzipSync(archiveBytes);
 await writeFile(join(output,'archive.json.gz'),compressed,{flag:'wx'});
 const study = await buildAnnualResearchStudyFromArchive(config,archive,new Date(startedAt));
 const studyBytes = JSON.stringify(study,null,2)+'\n';
 await writeFile(join(output,'baseline-study.json'),studyBytes,{flag:'wx'});
 const manifest = {...capture, completedAt:new Date().toISOString(), archiveSha256:hash(archiveBytes), archiveGzipSha256:hash(compressed), configurationSha256:hash(await readFile(join(output,'configuration.json'))), baselineStudySha256:hash(studyBytes), sourceCounts:archive.evidence.map(e=>e.sourceRecordCount), rawPayloadsRetained:archive.evidence.map(e=>archive.datasets[e.year].rawPayload !== undefined), interpretation:'Reanalysis-conditioned estimates; not measured production.2025 has previously been inspected.'};
 await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({output,mode,studyId:study.studyId,sourceCounts:manifest.sourceCounts,bytes:compressed.length}));
} catch(error) {
 await writeFile(join(output,'CAPTURE_FAILED.txt'),String(error)+'\n',{flag:'wx'}); throw error;
}
