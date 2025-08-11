'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const OUT_DIR = path.join(ROOT, 'dashboard');

function safeReadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function* walk(dir) {
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let st;
    try { st = fs.statSync(cur); } catch { continue; }
    if (st.isDirectory()) {
      const entries = fs.readdirSync(cur);
      for (const e of entries) stack.push(path.join(cur, e));
      const compose = ['driver.compose.json', 'driver.json']
        .map(n => path.join(cur, n))
        .find(p => fs.existsSync(p));
      if (compose) yield compose;
    }
  }
}

function aggregate() {
  const summary = {
    generatedAt: new Date().toISOString(),
    driversTotal: 0,
    byDomain: {},
    missingAssets: [],
    missingDeviceJs: [],
    invalidJson: [],
    examples: [],
  };

  if (!fs.existsSync(DRIVERS_DIR)) return summary;

  for (const composePath of walk(DRIVERS_DIR)) {
    const driverDir = path.dirname(composePath);
    const relDir = path.relative(DRIVERS_DIR, driverDir).replace(/\\/g, '/');
    const parts = relDir.split(/[\\/]/);
    const domain = parts[0] || 'unknown';
    const data = safeReadJSON(composePath);
    if (!data) {
      summary.invalidJson.push(composePath);
      continue;
    }

    summary.driversTotal += 1;
    summary.byDomain[domain] = summary.byDomain[domain] || { count: 0, items: [] };
    summary.byDomain[domain].count += 1;
    summary.byDomain[domain].items.push({ id: data.id || null, path: relDir, capabilities: data.capabilities || [] });

    const assetsDir = path.join(driverDir, 'assets');
    const imagesDir = path.join(assetsDir, 'images');
    const icon = path.join(assetsDir, 'icon.svg');
    const small = path.join(imagesDir, 'small.png');
    const missing = [];
    if (!fs.existsSync(icon)) missing.push('icon.svg');
    if (!fs.existsSync(small)) missing.push('small.png');
    if (missing.length) summary.missingAssets.push({ path: relDir, missing });

    const deviceJs = path.join(driverDir, 'device.js');
    if (!fs.existsSync(deviceJs)) summary.missingDeviceJs.push(relDir);

    if (summary.examples.length < 10) summary.examples.push({ id: data.id || null, path: relDir });
  }

  return summary;
}

function html(summary) {
  const byDomainRows = Object.entries(summary.byDomain)
    .map(([d, v]) => `<tr><td>${d}</td><td>${v.count}</td></tr>`)
    .join('');

  const missingAssetsRows = summary.missingAssets
    .slice(0, 100)
    .map(m => `<tr><td>${m.path}</td><td>${m.missing.join(', ')}</td></tr>`)
    .join('');

  const examples = summary.examples
    .map(e => `<li><code>${e.id || 'unknown'}</code> — ${e.path}</li>`)
    .join('');

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dashboard Tuya/Zigbee</title>
  <style>
    body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, sans-serif; margin:24px;}
    h1{margin:0 0 8px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin:16px 0}
    .card{border:1px solid #e5e7eb;border-radius:8px;padding:16px;background:#fff}
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid #eee;padding:8px;text-align:left}
    code{background:#f6f8fa;padding:2px 6px;border-radius:4px}
    .muted{color:#666;font-size:12px}
  </style>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
  <script>window.SUMMARY=${JSON.stringify(summary)}</script>
  </head>
<body>
  <h1>Dashboard Tuya/Zigbee</h1>
  <div class="muted">Généré: ${new Date(summary.generatedAt).toLocaleString('fr-FR')}</div>

  <div class="grid">
    <div class="card">
      <h3>Statistiques</h3>
      <p>Total drivers: <strong>${summary.driversTotal}</strong></p>
      <table>
        <thead><tr><th>Domaine</th><th>Compteur</th></tr></thead>
        <tbody>${byDomainRows || '<tr><td colspan="2">Aucun</td></tr>'}</tbody>
      </table>
    </div>

    <div class="card">
      <h3>Exemples</h3>
      <ul>${examples || '<li>Aucun</li>'}</ul>
    </div>

    <div class="card">
      <h3>Assets manquants</h3>
      <table>
        <thead><tr><th>Driver</th><th>Fichiers</th></tr></thead>
        <tbody>${missingAssetsRows || '<tr><td colspan="2">Aucun</td></tr>'}</tbody>
      </table>
    </div>
  </div>

  <p class="muted">Fichier source: dashboard/summary.json</p>
</body>
</html>`;
}

async function main() {
  try {
    const summary = aggregate();
    await fsp.mkdir(OUT_DIR, { recursive: true });
    await fsp.writeFile(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
    await fsp.writeFile(path.join(OUT_DIR, 'index.html'), html(summary), 'utf8');
    console.log(`[dashboard] summary -> ${path.join('dashboard', 'summary.json')}`);
    console.log(`[dashboard] html -> ${path.join('dashboard', 'index.html')}`);
  } catch (e) {
    console.error('[dashboard] fatal', e);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { aggregate };


