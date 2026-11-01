#!/usr/bin/env node
'use strict';
/**
 * P3134 (t730u) pre-removal multi-source check. Run BEFORE removing an exact mfr+pid couple from a driver:
 *   node scripts/maintenance/couple-removal-evidence.js --couple "_TZ3000_x|TS0042" --driver button_wireless_3 \
 *        --pr P3xxx --verdict "why it is wrong" [--write]
 * Gathers Z2M/ZHC, ZHA, deCONZ, Blakadder, Hubitat, Johan, forum, diags, git history (why it was added) and
 * the other pids of the same maker, and (with --write) records them in data/couple-removal-evidence.json.
 * scripts/ci/couple-removal-guard.js blocks a removal that has no entry here.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const SSOT = path.join(ROOT, 'data/couple-removal-evidence.json');
const REQUIRED = ['z2m', 'zha', 'deconz', 'blakadder', 'hubitat', 'johan', 'forum', 'diags', 'git_history', 'sibling_pids'];

const rd = (f) => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (_) { return ''; } };
const js = (f) => { try { return JSON.parse(rd(f)); } catch (_) { return null; } };

function gather(couple) {
  const [mfr, pid] = couple.split('|');
  const lo = mfr.toLowerCase();
  const kb = (js('data/kb/couples.json') || {}).couples || {};
  const kbHits = Object.keys(kb).filter((k) => k.split('|')[0].toLowerCase() === lo);
  const by = (tags) => {
    const h = (kb[couple] || []).filter((s) => tags.includes(s[0])).map((s) => `${s[0]}:${s[1]}`);
    return h.length ? h.join('; ') : `not listed for ${pid}`;
  };
  const textHit = (f) => rd(f).toLowerCase().includes(lo) ? `maker in ${f}` : `not in ${f}`;
  const forum = ((js('data/forum/forum-leads-ssot.json') || {}).couples || []).filter((c) => String(c.mfr).toLowerCase() === lo);
  const diag = ((js('data/diag-ids.json') || {}).reports || []).filter((r) => (r.mfrs || []).some((m) => m.toLowerCase() === lo));
  let gitLog = '';
  try { gitLog = execFileSync('git', ['log', '--format=%h %s', '-i', '-S', mfr, '--', 'drivers'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean).slice(-3).join(' | '); } catch (_) { /* shallow */ }
  return {
    z2m: by(['z2m', 'zhc']),
    zha: by(['zha']),
    deconz: by(['deconz']),
    blakadder: textHit('scripts/sync/data/blakadder.json'),
    hubitat: 'not in local data (no Hubitat dump in repo); check by hand',
    johan: by(['johan']),
    forum: forum.length ? forum.map((c) => `${c.pid}:${(c.posts || []).join(',')}`).join('; ') : 'no forum lead',
    diags: diag.length ? diag.map((r) => `${r.id}:${(r.pids || []).join('/')}`).join('; ') : 'no diag report',
    git_history: gitLog || 'no driver history found',
    sibling_pids: kbHits.join(', ') || 'none in kb',
  };
}

function load() { return js('data/couple-removal-evidence.json') || { schema: 1, required: REQUIRED, entries: [] }; }

function hasEvidence(ssot, mfr, driver) {
  return (ssot.entries || []).some((e) => e.couple.split('|')[0].toLowerCase() === mfr.toLowerCase() && e.driver === driver
    && REQUIRED.every((k) => e.sources && typeof e.sources[k] === 'string' && e.sources[k].length));
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const arg = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  const couple = arg('--couple'); const driver = arg('--driver');
  if (!couple || !driver) { console.error('usage: --couple "mfr|pid" --driver <id> [--pr Pxxxx --verdict text --write]'); process.exit(2); }
  const entry = { couple, driver, pr: arg('--pr') || '', verdict: arg('--verdict') || '', sources: gather(couple) };
  console.log(JSON.stringify(entry, null, 2));
  if (a.includes('--write')) {
    const s = load();
    s.entries = s.entries.filter((e) => !(e.couple === couple && e.driver === driver)).concat(entry);
    fs.writeFileSync(SSOT, `${JSON.stringify(s, null, 2)}\n`);
  }
}
module.exports = { REQUIRED, gather, load, hasEvidence };
