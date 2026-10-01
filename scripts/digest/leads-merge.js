'use strict';
/**
 * scripts/digest/leads-merge.js — merge digest-leads artifacts into the EXISTING market-couples
 * pipeline input, verifying heuristic leads against external datasets first.
 *
 * Usage: node scripts/digest/leads-merge.js <dir-with-downloaded-artifacts> [--out=.github/state/digest-leads]
 * Writes:
 *   <out>/couples.json  — { couples: [{ mfr, pid, label, heuristic, verified, verifiedBy[], refs[], basis }] }
 *                         read by tools/ci/cross-ref-all-sources.js → processDigestLeads()
 *   <out>/signals.json  — functional leads (DP / cluster / frame / behaviour / unmapped), DP names
 *                         verified against the Z2M herdsman cache where the mfr is known there
 *   <out>/SUMMARY.md    — appended to the job summary
 *
 * Rules (rules-digest guardrails):
 *   - Labels map to existing market sources: forum→forum, github-own→github-own,
 *     johan-issue→johan-issue, johan-comment→johan-comment. git-history never maps directly.
 *   - heuristic (OCR / link / git-history) couples are promoted to their label ONLY when the exact
 *     couple exists in an external dataset (Z2M herdsman cache, Blakadder, Z2M/ZHA crawls);
 *     otherwise they stay label `digest-heuristic` (report-only, outside every apply tier).
 *   - bastien-home commits are never promoted (experimental branch).
 *   - Never escalates to the `interview` tier: an interview block seen in an issue is still a
 *     user-sourced claim.
 */
const fs = require('fs');
const path = require('path');
const RD = require('./rules-digest');

const ROOT = process.cwd();
const IN = process.argv[2] || 'digest-leads-in';
const OUTDIR = path.resolve(ROOT, (process.argv.find((a) => a.startsWith('--out=')) || '--out=.github/state/digest-leads').slice(6));
const LABELS = { forum: 'forum', 'github-own': 'github-own', 'johan-issue': 'johan-issue', 'johan-comment': 'johan-comment' };

function walk(dir, out = []) {
  let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.json')) out.push(p); }
  return out;
}
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

// ---- external datasets (exact couple index + Z2M DP names per mfr)
function externalIndex() {
  const pairs = new Map(); // "mfr|PID" -> Set(sources)
  const dpNames = new Map(); // mfr -> Map(dp -> name)
  const add = (mfr, pid, src) => { if (!mfr || !pid) return; const k = `${String(mfr).trim().toLowerCase()}|${String(pid).trim().toUpperCase()}`; (pairs.get(k) || pairs.set(k, new Set()).get(k)).add(src); };
  const z = readJson(path.join(ROOT, 'data/z2m_herdsman_cache.json'));
  for (const d of (z && z.devices) || []) {
    for (const m of d.mfrs || []) {
      for (const p of d.modelIds || []) add(m, p, 'z2m-cache');
      if (d.dps && d.dps.length) { const mm = dpNames.get(m.toLowerCase()) || new Map(); for (const dp of d.dps) if (!mm.has(dp.id)) mm.set(dp.id, dp.name); dpNames.set(m.toLowerCase(), mm); }
    }
  }
  for (const [file, src] of [['scripts/sync/data/blakadder.json', 'blakadder'], ['scripts/sync/data/z2m.json', 'z2m'], ['scripts/sync/data/zha.json', 'zha'], ['scripts/sync/data/deconz.json', 'deconz']]) {
    const j = readJson(path.join(ROOT, file));
    for (const fp of (j && j.fingerprints) || []) add(fp.mfr, fp.productId, src);
  }
  return { pairs, dpNames };
}

function main() {
  const rules = RD.build();
  const pinned = (rules && rules.deviceTruth) || {};
  const files = walk(path.resolve(ROOT, IN));
  const recs = [];
  for (const f of files) { const j = readJson(f); if (j && Array.isArray(j.records)) recs.push(...j.records); }
  const ext = externalIndex();
  const couples = new Map(); const signals = [];
  for (const r of recs) {
    for (const c of r.couples || []) {
      const mfr = String(c.mfr).trim(); const pid = String(c.pid).trim().toUpperCase();
      const k = `${mfr.toLowerCase()}|${pid}`;
      const heuristic = !!(r.heuristic || c.heuristic);
      const verifiedBy = [...(ext.pairs.get(k) || [])];
      const experimental = r.branch === 'bastien-home';
      let label = LABELS[r.source] || null;
      if (r.source === 'git-history') label = verifiedBy.length && !experimental ? 'github-own' : null;
      if (heuristic && !verifiedBy.length) label = null;
      const cur = couples.get(k) || { mfr, pid, labels: new Set(), heuristic: true, verifiedBy: new Set(), refs: [], basis: new Set(), pinnedTo: pinned[mfr.toLowerCase()] };
      if (label) cur.labels.add(label);
      if (!heuristic) cur.heuristic = false;
      verifiedBy.forEach((v) => cur.verifiedBy.add(v));
      cur.basis.add(`${c.basis}${heuristic ? '/' + r.origin : ''}`);
      if (cur.refs.length < 5 && !cur.refs.includes(r.ref)) cur.refs.push(r.ref);
      couples.set(k, cur);
    }
    const s = r.signals || {};
    if (s.dp || s.cluster || s.frame || s.behaviour || s.unmapped) {
      const out = { source: r.source, ref: r.ref, origin: r.origin, heuristic: true, mfr: r.mfr, pid: r.pid, ...s };
      if (s.dp && r.mfr && r.mfr.length === 1) {
        const names = ext.dpNames.get(r.mfr[0]);
        if (names) { out.dpVerified = Object.fromEntries(s.dp.filter((d) => names.has(d)).map((d) => [d, names.get(d)])); out.verified = Object.keys(out.dpVerified).length > 0; out.verifiedBy = 'z2m-cache'; }
      }
      signals.push(out);
    }
  }
  const list = [...couples.values()].map((c) => ({
    mfr: c.mfr, pid: c.pid,
    label: c.labels.size ? [...c.labels][0] : 'digest-heuristic',
    labels: [...c.labels], heuristic: c.heuristic, verified: c.verifiedBy.size > 0, verifiedBy: [...c.verifiedBy],
    basis: [...c.basis], refs: c.refs, pinnedTo: c.pinnedTo,
  }));
  fs.mkdirSync(OUTDIR, { recursive: true });
  fs.writeFileSync(path.join(OUTDIR, 'couples.json'), JSON.stringify({ generatedAt: new Date().toISOString(), records: recs.length, artifacts: files.length, couples: list }, null, 1));
  fs.writeFileSync(path.join(OUTDIR, 'signals.json'), JSON.stringify({ generatedAt: new Date().toISOString(), signals: signals.slice(0, 2000) }, null, 1));
  const promoted = list.filter((c) => c.label !== 'digest-heuristic');
  const md = [
    '### 🔁 Digest feedback loop → market couples',
    `- artifacts: ${files.length} · records: ${recs.length} · couples: ${list.length} (sourced: ${promoted.length}, heuristic report-only: ${list.length - promoted.length})`,
    `- functional leads (DP/cluster/frame/behaviour): ${signals.length} · DP meanings confirmed by external cross-reference: ${signals.filter((s) => s.verified).length}`,
    `- rules-digest: ${rules ? rules.rules.length + ' rules, hash ' + rules.inputsHash.slice(0, 12) : 'n/a'}`,
    ...promoted.slice(0, 15).map((c) => `  - \`${c.mfr}\` + \`${c.pid}\` ← ${c.labels.join(',')}${c.verified ? ' ✔ external cross-reference ×' + c.verifiedBy.length : ''}${c.pinnedTo ? ' (DEVICE_TRUTH: ' + c.pinnedTo.join(',') + ')' : ''}`),
  ].join('\n');
  fs.writeFileSync(path.join(OUTDIR, 'SUMMARY.md'), md + '\n');
  console.log(md);
}

main();
