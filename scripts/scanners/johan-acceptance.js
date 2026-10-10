#!/usr/bin/env node
'use strict';
/**
 * P2810: acceptance view over data/leads/johan-canonical-index.json (no network, no AI).
 * For every canonical thread (and every thread that cites identities) it records:
 *   - the mfr|pid identities and whether each one already has exactly one home driver here,
 *   - the objective keys and regression flag parsed by the index (keys only, never text),
 *   - an acceptance state: covered | missing-couple | dual-couple | behaviour (needs physical test).
 * Output: data/leads/johan-acceptance.json (links + structured fields only, C1/C5).
 *   node scripts/scanners/johan-acceptance.js [--out=...]
 */
const fs = require('fs');
const path = require('path');
const { driverIndex } = require('../progress/lib/sweep-identity');

const ROOT = path.join(__dirname, '../..');
const IDX = path.join(ROOT, 'data/leads/johan-canonical-index.json');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.join(ROOT, arg('out', 'data/leads/johan-acceptance.json'));

function main() {
  let idx;
  try { idx = JSON.parse(fs.readFileSync(IDX, 'utf8')); } catch { console.log('[johan-acceptance] no index; skip'); return; }
  const { couples } = driverIndex();
  const rows = [];
  for (const e of Object.values(idx.issues || {})) {
    const ids = (e.identities || []).filter((x) => Array.isArray(x) && x[0] && x[1]);
    const isCanonical = e.canonical == null || e.canonical === e.n || !e.duplicateTrackingOnly;
    if (!ids.length && !(isCanonical && (e.objectives || []).length)) continue;
    const cov = ids.map(([m, p]) => {
      const ds = couples.get(`${String(m).toLowerCase()}|${String(p).toLowerCase()}`) || [];
      return { mfr: m, pid: p, drivers: ds };
    });
    const missing = cov.filter((c) => !c.drivers.length);
    const dual = cov.filter((c) => c.drivers.length > 1);
    let state = 'covered';
    if (missing.length) state = 'missing-couple';
    else if (dual.length) state = 'dual-couple';
    else if (e.regression || (e.objectives || []).length) state = 'behaviour';
    rows.push({
      n: e.n, url: e.url, state: e.state, closedAt: e.closed_at || undefined, reason: e.state_reason || undefined,
      canonical: e.canonical == null ? undefined : e.canonical, batches: (e.batches || []).length ? e.batches : undefined,
      regression: !!e.regression, objectives: (e.objectives || []).map((o) => o.key),
      coverage: cov, acceptance: state,
    });
  }
  rows.sort((a, b) => a.n - b.n);
  const by = rows.reduce((a, r) => { a[r.acceptance] = (a[r.acceptance] || 0) + 1; return a; }, {});
  const missingCouples = [...new Set(rows.flatMap((r) => r.coverage.filter((c) => !c.drivers.length).map((c) => `${c.mfr}|${c.pid}`)))].sort();
  const out = {
    generated: new Date().toISOString(), source: 'data/leads/johan-canonical-index.json', repo: idx.repo,
    note: 'Acceptance view, structured fields only. missing-couple = identity cited upstream with no home driver here (verify real hardware before adding, W4). behaviour = needs physical test, not a pairing gap.',
    summary: { threads: rows.length, ...by, missingCouples: missingCouples.length },
    missingCouples, rows,
  };
  fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  console.log(JSON.stringify(out.summary));
}
main();
