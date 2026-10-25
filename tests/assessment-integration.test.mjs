import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/v1/studies/assessment/route.ts';
import { validateAssessmentEvidenceBundle, computeAssessmentSelection } from '../lib/research/assessment-evidence.ts';
import { decisionReportHtml, decisionReportHtmlBody } from '../lib/research/report-html.ts';

test('served assessment evidence validates and is a fixed case independent of dashboard query inputs', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('No external requests are allowed for saved evidence'); };
  try {
    const response = await GET(new Request('https://example.test/api/v1/studies/assessment?capacityKwDc=999'));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'private, max-age=3600');
    const { data } = await response.json();
    const bundle = await validateAssessmentEvidenceBundle(data);
    assert.equal(bundle.baseline.capacityKwDc, 48);
    const analysis = computeAssessmentSelection(bundle);
    assert.deepEqual(analysis.choice.robustWinnerIds, ['tilt-42_azimuth-180']);
    assert.equal(analysis.choice.worstRegretReductionKWh.maximum, 0);
    assert.match(analysis.reportMarkdown, /previously inspected/i);
  } finally { globalThis.fetch = oldFetch; }
});

test('readable report export escapes active content and retains semantic tables and plain claims', () => {
  const body = decisionReportHtmlBody('# Test <script>alert(1)</script>\n\n**Zero benefit**\n\n| Value | Source |\n| --- | --- |\n| 12 | <img src=x onerror=alert(1)> |\n');
  assert.match(body, /<strong>Zero benefit<\/strong>/);
  assert.match(body, /<table><thead>/);
  assert.match(body, /scope="col"/);
  assert.doesNotMatch(body, /<script|<img/);
  assert.match(body, /&lt;script&gt;/);
  const html = decisionReportHtml('No measured production.');
  assert.match(decisionReportHtmlBody('study\\_sheffield'), /study_sheffield/);
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /No measured production/);
  assert.match(html, /@media print/);
});
