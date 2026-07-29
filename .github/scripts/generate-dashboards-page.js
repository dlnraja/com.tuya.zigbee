#!/usr/bin/env node
'use strict';
/**
 * generate-dashboards-page.js — Publish the 6 HTML dashboards to GitHub Pages.
 *
 * Regenerates the dashboards from live data (scripts/dashboard/generate-*.js),
 * copies the HTML into .github/pages-build/dashboards/, and builds a hub page
 * (dashboards.html) in the Device Finder dark style linking them.
 * Called by generate-device-finder.js during the deploy-pages workflow.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'scripts', 'dashboard');
const OUT = path.join(ROOT, '.github', 'pages-build');
const OUT_DIR = path.join(OUT, 'dashboards');

const DASHBOARDS = [
  { gen: 'generate-master-dashboard.js', file: 'master-dashboard.html', title: 'Master Dashboard', desc: 'Global health, drivers, fingerprints, flow cards, images' },
  { gen: 'generate-driver-dashboard.js', file: 'driver-dashboard.html', title: 'Driver Dashboard', desc: 'Per-driver detail and coverage' },
  { gen: 'generate-coverage-dashboard.js', file: 'coverage-dashboard.html', title: 'Coverage Dashboard', desc: 'Fingerprint and source coverage' },
  { gen: 'generate-error-dashboard.js', file: 'error-dashboard.html', title: 'Error Dashboard', desc: 'Anti-patterns and code findings' },
  { gen: 'generate-dependency-dashboard.js', file: 'dependency-dashboard.html', title: 'Dependency Dashboard', desc: 'Module graph, cycles, unused modules' },
  { gen: 'generate-performance-dashboard.js', file: 'performance-dashboard.html', title: 'Performance Dashboard', desc: 'Syntax checks and perf history' },
];

module.exports = function generateDashboardsPage() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const published = [];
  for (const d of DASHBOARDS) {
    // Regenerate from live data (non-fatal per dashboard)
    try {
      execFileSync(process.execPath, [path.join(SRC, d.gen)], { cwd: ROOT, stdio: 'pipe', timeout: 120000 });
    } catch (e) {
      console.warn(`[dashboards-page] ${d.gen} failed (using stale HTML if present): ${e.message.slice(0, 120)}`);
    }
    const src = path.join(SRC, d.file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(OUT_DIR, d.file));
      published.push(d);
    } else {
      console.warn(`[dashboards-page] ${d.file} missing — skipped`);
    }
  }

  const cards = published.map(d => `
      <a class="card" href="dashboards/${d.file}">
        <h3>${d.title}</h3>
        <p>${d.desc}</p>
      </a>`).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboards — Universal Tuya Zigbee</title>
<style>
:root{--bg:#0d1117;--fg:#c9d1d9;--muted:#8b949e;--accent:#58a6ff;--card:#161b22;--border:#30363d}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
header{padding:2rem 1.5rem 1rem;border-bottom:1px solid var(--border)}
h1{margin:0 0 .5rem;font-size:1.5rem}
.sub{color:var(--muted);font-size:.9rem}
main{padding:1.5rem;max-width:1100px;margin:0 auto}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem}
.card{display:block;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:1rem 1.2rem;text-decoration:none;color:var(--fg);transition:border-color .15s}
.card:hover{border-color:var(--accent)}
.card h3{margin:.2rem 0 .4rem;color:var(--accent);font-size:1.05rem}
.card p{margin:0;color:var(--muted);font-size:.85rem}
footer{padding:1.5rem;border-top:1px solid var(--border);color:var(--muted);font-size:.8rem}
a{color:var(--accent)}
</style>
</head>
<body>
<header>
<h1>📊 Project Dashboards</h1>
<p class="sub">Live health metrics for Universal Tuya Zigbee — regenerated on every Pages deploy</p>
<p class="sub"><a href="index.html">← Device Finder</a> · <a href="wifi.html">📡 WiFi Devices</a></p>
</header>
<main>
<div class="grid">
${cards}
</div>
</main>
<footer>
<p>Generated ${new Date().toISOString().slice(0, 10)} | <a href="https://github.com/dlnraja/com.tuya.zigbee">GitHub</a> | <a href="https://community.homey.app/t/140352">Forum</a></p>
</footer>
</body>
</html>`;

  fs.writeFileSync(path.join(OUT, 'dashboards.html'), html);
  console.log(`[dashboards-page] ${published.length}/6 dashboards published + hub page written`);
  return published.length;
};

if (require.main === module) module.exports();
