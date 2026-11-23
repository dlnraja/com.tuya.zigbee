#!/usr/bin/env node
'use strict';
/**
 * P3363 - one entry point the weekly workflow calls.
 *   node scripts/automation/p3363-coherence-run.js [--root DIR] [--fix] [--report FILE]
 * Changelog first, then store text. Never deletes driver / flow / capability ids.
 */
const fs = require('fs');
const path = require('path');
const CC = require('./changelog-coherence.js');
const ST = require('./store-text-coherence.js');

function inventory(root) {
  const drivers = {};
  const dir = path.join(root, 'drivers');
  if (!fs.existsSync(dir)) return drivers;
  for (const id of fs.readdirSync(dir)) {
    const p = path.join(dir, id);
    try { if (!fs.statSync(p).isDirectory()) continue; } catch (_e) { continue; }
    const ids = { flow: [], couples: [] };
    for (const fn of ['driver.compose.json', 'driver.flow.compose.json']) {
      const f = path.join(p, fn);
      if (!fs.existsSync(f)) continue;
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (j.zigbee) {
        const m = [].concat(j.zigbee.manufacturerName || []);
        const q = [].concat(j.zigbee.productId || []);
        ids.couples = m.flatMap((mm) => q.map((qq) => `${mm}|${qq}`));
      }
      for (const k of ['triggers', 'conditions', 'actions']) {
        for (const c of j[k] || []) if (c && c.id) ids.flow.push(c.id);
      }
    }
    drivers[id] = ids;
  }
  return drivers;
}

function sameInventory(before, after) {
  const lost = [];
  for (const id of Object.keys(before)) {
    if (!after[id]) { lost.push({ driver: id, kind: 'driver' }); continue; }
    const bf = new Set(before[id].flow);
    const af = new Set(after[id].flow);
    for (const c of bf) if (!af.has(c)) lost.push({ driver: id, kind: 'flow', id: c });
    const bc = new Set(before[id].couples);
    const ac = new Set(after[id].couples);
    for (const c of bc) if (!ac.has(c)) lost.push({ driver: id, kind: 'couple', id: c });
  }
  return lost;
}

if (require.main === module) {
  const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
  const root = path.resolve(arg('--root') || process.cwd());
  const report = arg('--report') || path.join(root, 'reports', 'p3363-coherence-report.json');
  const doFix = process.argv.includes('--fix');
  const before = inventory(root);
  const out = { at: new Date().toISOString(), root, fix: doFix };
  if (doFix) {
    out.changelog = CC.apply(root);
    fs.writeFileSync(out.changelog.file, out.changelog.json);
    delete out.changelog.json;
    delete out.changelog.obj;
    out.store = ST.apply(root);
    out.changelogAudit = CC.audit(root);
    out.storeCheck = ST.check(root);
  } else {
    out.changelogAudit = CC.audit(root);
    out.storeCheck = ST.check(root);
  }
  const after = inventory(root);
  out.lostIds = sameInventory(before, after);
  if (out.lostIds.length) {
    console.error('p3363-coherence-run: refused, ids would be lost', out.lostIds.slice(0, 8));
    process.exitCode = 2;
  } else {
    const fatal = (out.changelogAudit.findings || []).filter((f) => f.code === 'foreign-versions' || f.code === 'version-mismatch')
      .concat((out.storeCheck.findings || []).filter((f) => [
        'duplicate-title', 'duplicate-driver-name', 'missing-accent',
        'wrong-language-or-wording', 'en-in-fr-name', 'en-in-fr-title',
      ].includes(f.code)));
    out.fatal = fatal;
    console.log(`p3363-coherence-run: fix=${doFix} changelogFindings=${out.changelogAudit.findings.length} storeFatal=${out.storeCheck.fatal || 0} leftover=${fatal.length}`);
    process.exitCode = (!doFix && fatal.length) ? 1 : 0;
  }
  fs.mkdirSync(path.dirname(report), { recursive: true });
  fs.writeFileSync(report, JSON.stringify(out, null, 2) + '\n');
  console.log(`report: ${report}`);
}

module.exports = { inventory, sameInventory };
