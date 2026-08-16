#!/usr/bin/env node
'use strict';
/**
 * generate-inbox-page.js — converts reports/community-inbox.md (daily digest)
 * into a styled .github/pages-build/inbox.html page for GitHub Pages.
 * Called by generate-device-finder.js.
 */
const fs = require('fs');
const path = require('path');

module.exports = function generateInboxPage() {
  const ROOT = path.join(__dirname, '..', '..');
  const SRC = path.join(ROOT, 'reports', 'community-inbox.md');
  const OUT = path.join(ROOT, '.github', 'pages-build', 'inbox.html');

  let md = '';
  try {md = fs.readFileSync(SRC, 'utf8');}
  catch {md = '# Community Inbox\n\nNo digest yet — the `community-inbox` workflow generates it daily.\n';}

  // mini-markdown → HTML (titres, listes, liens, gras)
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>');
  const html = md.split('\n').map((line) => {
    if (line.startsWith('### ')) {return `<h3>${inline(line.slice(4))}</h3>`;}
    if (line.startsWith('## ')) {return `<h2>${inline(line.slice(3))}</h2>`;}
    if (line.startsWith('# ')) {return `<h1>${inline(line.slice(2))}</h1>`;}
    if (line.startsWith('- ')) {return `<li>${inline(line.slice(2))}</li>`;}
    if (!line.trim()) {return '';}
    return `<p>${inline(line)}</p>`;
  }).join('\n').replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');

  const page = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Community Inbox — Universal Tuya</title>
<style>
:root{--bg:#0d1117;--card:#161b22;--border:#30363d;--text:#e6edf3;--muted:#8b949e;--brand:#00b38f}
*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);margin:0;padding:24px}
main{max-width:900px;margin:0 auto}
h1{font-size:1.6rem;border-bottom:1px solid var(--border);padding-bottom:.5rem}
h2{color:var(--brand);font-size:1.2rem;margin-top:1.5rem}
h3{font-size:1rem;color:var(--muted)}
ul{padding-left:1.2rem}li{margin:.35rem 0;line-height:1.4}
a{color:var(--brand);text-decoration:none}a:hover{text-decoration:underline}
code{background:var(--card);border:1px solid var(--border);border-radius:4px;padding:0 4px;font-size:.85em}
nav{margin-bottom:1.5rem}nav a{margin-right:1rem;font-size:.9rem}
footer{margin-top:2rem;color:var(--muted);font-size:.8rem;border-top:1px solid var(--border);padding-top:1rem}
</style></head><body><main>
<nav>
<a href="index.html">Device Finder</a>
<a href="wifi.html">WiFi</a>
<a href="dashboards.html">Dashboards</a>
<a href="https://github.com/dlnraja/com.tuya.zigbee/issues">Issues</a>
<a href="https://community.homey.app/t/140352">Forum</a>
</nav>
${html}
<footer>Generated from reports/community-inbox.md — updated daily by the community-inbox workflow.</footer>
</main></body></html>`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, page);
  console.log('inbox.html generated');
};
