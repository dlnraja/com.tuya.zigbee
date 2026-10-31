#!/usr/bin/env node
'use strict';
// P3097 (t649u): every workflow needs a concurrency group and every job a timeout-minutes.
// Ratchet: existing offenders are frozen in config/workflow-resource-baseline.json; any NEW offender fails.
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..', '..');
const WF = path.join(ROOT, '.github', 'workflows');
const BASE = path.join(ROOT, 'config', 'workflow-resource-baseline.json');

function offenders(dir = WF) {
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => /\.ya?ml$/.test(x)).sort()) {
    let d; try { d = yaml.load(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { out.push(`${f}:unparseable`); continue; }
    if (!d || !d.jobs) continue;
    if (!d.concurrency && !Object.values(d.jobs).every((j) => j && j.concurrency)) out.push(`${f}:no-concurrency`);
    for (const [id, j] of Object.entries(d.jobs)) if (j && !j.uses && j['timeout-minutes'] == null) out.push(`${f}:${id}:no-timeout`);
  }
  return out;
}

if (require.main === module) {
  const list = offenders();
  if (process.argv.includes('--update')) { fs.writeFileSync(BASE, JSON.stringify(list, null, 2) + '\n'); console.log(`baseline ${list.length}`); process.exit(0); }
  const base = new Set(JSON.parse(fs.readFileSync(BASE, 'utf8')));
  const fresh = list.filter((x) => !base.has(x));
  fresh.forEach((x) => console.log(`::error::workflow-resource-gate: ${x} (add timeout-minutes / concurrency)`));
  console.log(`offenders ${list.length} (baseline ${base.size}, new ${fresh.length})`);
  process.exit(fresh.length ? 1 : 0);
}
module.exports = { offenders };
