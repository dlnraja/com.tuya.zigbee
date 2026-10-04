#!/usr/bin/env node
'use strict';
/*
 * W5 / PCr2-2 audit: compare device interviews (docs/data/interviews/*.json with endpoints or
 * inputClusters) with the endpoint clusters declared by the driver(s) holding that couple.
 *
 * Facts this relies on (Homey SDK, wireless/zigbee): drivers are matched on manufacturerName +
 * productId only, and only clusters listed in the manifest are exposed on the ZCLNode, while
 * zigbee-clusters builds the node from the device's own endpoint descriptors. So:
 *  - a compose cluster the device lacks never blocks pairing; it is simply absent at runtime
 *    (already "optional", nothing to remove);
 *  - an interview cluster the compose lacks is NOT reachable from device code; adding it is the
 *    only W5 action ("only ADD"), and it needs per-driver review because a newly visible cluster can
 *    switch code paths for every device of that driver.
 *
 * Usage: node tools/audit/w5-interview-clusters.js [--json] [--md <file>]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const lc = (s) => String(s || '').trim().toLowerCase();

function composeIndex() {
  const idx = new Map();
  const dDir = path.join(ROOT, 'drivers');
  for (const d of fs.readdirSync(dDir).sort()) {
    const f = path.join(dDir, d, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    const z = j.zigbee || {};
    const mfrs = new Set((z.manufacturerName || []).map(lc));
    const pids = new Set((Array.isArray(z.productId) ? z.productId : [z.productId]).map(lc));
    const eps = {};
    for (const [id, e] of Object.entries(z.endpoints || {})) eps[id] = new Set((e.clusters || []).map(Number));
    idx.set(d, { mfrs, pids, eps });
  }
  return idx;
}

function interviews() {
  const out = [];
  const dir = path.join(ROOT, 'docs', 'data', 'interviews');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    let j; try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    const mfr = j.manufacturerName; const pid = j.productId;
    if (!mfr || !pid || !j.endpoints || typeof j.endpoints !== 'object') continue;
    const eps = {};
    for (const [id, e] of Object.entries(j.endpoints)) {
      if (e && Array.isArray(e.inputClusters)) eps[id] = new Set(e.inputClusters.map(Number));
    }
    if (Object.keys(eps).length) out.push({ file: f, mfr, pid, eps });
  }
  return out;
}

function audit() {
  const idx = composeIndex();
  const rows = [];
  for (const it of interviews()) {
    const drivers = [...idx.entries()].filter(([, c]) => c.mfrs.has(lc(it.mfr)) && c.pids.has(lc(it.pid)));
    if (!drivers.length) { rows.push({ mfr: it.mfr, pid: it.pid, driver: null, composeOnly: {}, interviewOnly: {} }); continue; }
    for (const [d, c] of drivers) {
      const composeOnly = {}; const interviewOnly = {};
      for (const [ep, set] of Object.entries(c.eps)) {
        const have = it.eps[ep] || new Set();
        const miss = [...set].filter((x) => !have.has(x)).sort((a, b) => a - b);
        if (miss.length) composeOnly[ep] = miss;
      }
      for (const [ep, set] of Object.entries(it.eps)) {
        const decl = c.eps[ep] || new Set();
        const extra = [...set].filter((x) => !decl.has(x)).sort((a, b) => a - b);
        if (extra.length) interviewOnly[ep] = extra;
      }
      rows.push({ mfr: it.mfr, pid: it.pid, driver: d, composeOnly, interviewOnly });
    }
  }
  return rows;
}

const rows = audit();
const fmt = (o) => Object.entries(o).map(([ep, l]) => `ep${ep}:[${l.join(', ')}]`).join('; ') || '—';
const summary = {
  interviews: new Set(rows.map((r) => `${r.mfr}|${r.pid}`)).size,
  unsupportedCouples: rows.filter((r) => !r.driver).length,
  rowsWithComposeOnly: rows.filter((r) => r.driver && Object.keys(r.composeOnly).length).length,
  rowsWithInterviewOnly: rows.filter((r) => r.driver && Object.keys(r.interviewOnly).length).length,
};
if (args.includes('--json')) {
  console.log(JSON.stringify({ summary, rows }, null, 1));
} else {
  console.log(`[w5] ${JSON.stringify(summary)}`);
}
const mdIdx = args.indexOf('--md');
if (mdIdx >= 0) {
  const lines = rows.filter((r) => r.driver && (Object.keys(r.composeOnly).length || Object.keys(r.interviewOnly).length))
    .map((r) => `| ${r.mfr} | ${r.pid} | ${r.driver} | ${fmt(r.composeOnly)} | ${fmt(r.interviewOnly)} |`);
  const unsupported = rows.filter((r) => !r.driver).map((r) => `\`${r.mfr}\` / ${r.pid}`);
  const md = `## Generated table (\`node tools/audit/w5-interview-clusters.js --md ...\`)\n\n${JSON.stringify(summary)}\n\n` +
    '| mfr | pid | driver | in compose, not in interview (absent at runtime, harmless) | in interview, not in compose (add candidates, review per driver) |\n|---|---|---|---|---|\n' +
    `${lines.join('\n')}\n\nCouples from interviews with no driver: ${unsupported.join(', ') || 'none'}\n`;
  fs.writeFileSync(path.resolve(ROOT, args[mdIdx + 1]), md);
}
