/** A deliberately small, escaped renderer for the generated decision-report template. */
const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const inline = (value: string) => escape(value).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\\([\\`*_{}\[\]()#+.!-])/g, '$1');

export function decisionReportHtmlBody(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) { result.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); continue; }
    if (line.startsWith('|') && /^[|\s:-]+$/.test(lines[i + 1] ?? '')) {
      const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map(cell => inline(cell.trim()));
      result.push('<div class="report-table" tabindex="0" role="region" aria-label="Report data table"><table><thead><tr>' + cells(line).map(cell => `<th scope="col">${cell}</th>`).join('') + '</tr></thead><tbody>');
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        result.push('<tr>' + cells(lines[i]).map(cell => `<td>${cell}</td>`).join('') + '</tr>'); i++;
      }
      i--; result.push('</tbody></table></div>'); continue;
    }
    result.push(`<p>${inline(line)}</p>`);
  }
  return result.join('\n');
}

export function decisionReportHtml(markdown: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Solar decision evidence report</title><style>
body{margin:auto;padding:36px;max-width:1100px;font:16px/1.55 system-ui,sans-serif;color:#193b4b;background:#f8fbfc}h1{font-size:30px}h2{margin-top:2em;font-size:22px}h3{font-size:18px}p{overflow-wrap:anywhere}.report-table{overflow:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:9px;border:1px solid #c6d7df;text-align:left}th{background:#e7f1f4}footer{margin-top:36px;border-top:1px solid #c6d7df;padding-top:14px;font-size:13px}@media print{body{padding:0;max-width:none;color:#102c38;background:white;font-size:10pt}h1{font-size:21pt}h2{break-after:avoid;font-size:15pt}table{font-size:8pt}thead{display:table-header-group}tr{break-inside:avoid}.report-table{overflow:visible}@page{size:A4;margin:16mm}}</style></head><body><main>${decisionReportHtmlBody(markdown)}</main><footer>Exported from Solar Intelligence. Use your browser’s Print command to save a PDF. The report contains its own evidence scope and source identities.</footer></body></html>`;
}
