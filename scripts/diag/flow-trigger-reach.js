'use strict';
// P3065 flow uplift (a): static reachability of declared driver triggers. A trigger is reachable
// when its id is quoted in JS, matches a `${...}` template id, is `<driver>_<quoted suffix>`, or is
// mapped in config/flow/dead-flow-autowire.json (fired on capability change). The rest are
// 'orphans': declared but never fired. Read-only. Usage: node scripts/diag/flow-trigger-reach.js [root] [--list]
const fs = require('fs'), path = require('path');
const root = require.main === module && process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(__dirname, '..', '..');
const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === 'node_modules' || e.name.startsWith('.')) continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) files.push(p); } };
for (const d of ['lib', 'drivers']) walk(path.join(root, d));
files.push(path.join(root, 'app.js'));
const lits = new Set(); const tpls = []; const tplSrc = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/'([A-Za-z0-9_]{3,80})'|"([A-Za-z0-9_]{3,80})"/g)) lits.add(m[1] || m[2]);
  for (const m of s.matchAll(/`([^`\n]{3,120})`/g)) {
    const t = m[1]; if (!t.includes('${')) { if (/^[A-Za-z0-9_]+$/.test(t)) lits.add(t); continue; }
    const parts = t.split(/\$\{[^}]*\}/); const stat = parts.join('');
    if (!/^[A-Za-z0-9_]*$/.test(stat) || stat.replace(/_/g, '').length < 3) continue;
    if (tplSrc.has(t)) continue; tplSrc.add(t);
    tpls.push({ t, re: new RegExp('^' + parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[A-Za-z0-9_]+') + '$'), f: path.relative(root, f) });
  }
}
let autoMap = {};
try { autoMap = JSON.parse(fs.readFileSync(path.join(root, 'config', 'flow', 'dead-flow-autowire.json'), 'utf8')).triggers || {}; } catch (_) { autoMap = {}; }
const out = { literal: [], template: [], suffix: [], autowire: [], orphan: [] };
for (const d of fs.readdirSync(path.join(root, 'drivers'))) {
  const p = path.join(root, 'drivers', d, 'driver.flow.compose.json'); if (!fs.existsSync(p)) continue;
  const caps = (JSON.parse(fs.readFileSync(path.join(root, 'drivers', d, 'driver.compose.json'), 'utf8')).capabilities) || [];
  for (const t of JSON.parse(fs.readFileSync(p, 'utf8')).triggers || []) {
    const rec = { driver: d, id: t.id, title: (t.title || {}).en, caps, hasArgs: (t.args || []).some((a) => a.type !== 'device'), tokens: (t.tokens || []).map((x) => x.name) };
    if (lits.has(t.id)) { out.literal.push(rec); continue; }
    if (autoMap[t.id]) { rec.via = autoMap[t.id].cap; out.autowire.push(rec); continue; }
    const tp = tpls.find((x) => x.re.test(t.id));
    if (tp) { rec.via = tp.t + ' @' + tp.f; out.template.push(rec); continue; }
    const suf = t.id.startsWith(d + '_') ? t.id.slice(d.length + 1) : null;
    if (suf && lits.has(suf)) { rec.via = suf; out.suffix.push(rec); continue; }
    out.orphan.push(rec);
  }
}
module.exports = out;
if (require.main === module) {
  console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])));
  if (process.argv.includes('--list')) for (const r of out.orphan) console.log(`${r.id} | ${r.title}`);
}
