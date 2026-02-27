export function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

export function exportCSV(rows: string[][], filename: string) {
  const content = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF(title: string, html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<html><head><title>${escapeHtml(title)}</title>
  <style>
    body{font-family:sans-serif;font-size:13px;color:#1a1a1a;padding:32px;max-width:960px;margin:0 auto;}
    h1{font-size:20px;margin-bottom:2px;} .sub{color:#888;font-size:11px;margin-bottom:20px;}
    .section-title{font-size:14px;font-weight:700;margin:20px 0 8px;border-bottom:2px solid #eee;padding-bottom:5px;}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;}
    th{background:#f0f0f0;text-align:left;padding:7px 10px;font-size:11px;font-weight:600;}
    td{padding:6px 10px;border-bottom:1px solid #f5f5f5;font-size:11px;}
    .badge{display:inline-block;padding:2px 7px;border-radius:99px;font-size:10px;font-weight:600;}
    .done{background:#d1fae5;color:#065f46;} .prog{background:#e0f2fe;color:#0369a1;} .todo{background:#f3f4f6;color:#6b7280;}
    .fee{background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;}
    .bar-wrap{background:#e5e7eb;border-radius:99px;height:6px;min-width:60px;}
    .bar{background:#0891b2;border-radius:99px;height:6px;}
    .stat-row{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;}
    .stat{background:#f5f5f5;border-radius:10px;padding:14px 20px;min-width:110px;}
    .stat-val{font-size:24px;font-weight:700;} .stat-lbl{font-size:11px;color:#888;margin-top:2px;}
  </style></head><body>
  ${html}
  </body></html>`);
  w.document.close();
  setTimeout(() => {
    w.print();
    w.close();
  }, 400);
}
