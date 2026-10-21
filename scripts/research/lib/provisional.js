'use strict';
/**
 * P2936 provisional tier + placement for cross-research verdicts.
 *  - place: exact couple confirmed by >=1 reliable reference, ONE specific driver that already lists
 *    the productId → manufacturerName appended (compose + app.json, byte-identical JSON round-trip).
 *  - provisional: ids taken verbatim from evidence (post/OCR/diag/listing) but no reference confirms
 *    the pairing → hosted by the generic fallback driver universal_zigbee (native clusters only,
 *    DPs optional), recorded in data/leads/provisional-couples.json with confidence + sources.
 *    Only when the manufacturerName is on NO driver at all (so no sacred couple is duplicated).
 *  - promote: a later run finds a confirming reference + single target → moved to that driver.
 *  - demote: the couple now conflicts (manufacturerName on a specific driver sharing a productId)
 *    → removed from the host, entry kept with status "demoted" + reason (never silently deleted).
 */
const fs = require('fs');
const path = require('path');

const HOSTS = ['universal_zigbee'];
const HOST = HOSTS[0];
const VALID_MFR = /^(_T[A-Z0-9]{2,5}_[a-z0-9]{8}|_TYZB0[12]_[a-z0-9]{8}|TUYATEC-[a-z0-9]{8})$/i;
const lc = (s) => String(s || '').toLowerCase();
const PFILE = 'data/leads/provisional-couples.json';
const AFILE = 'data/leads/auto-applied.json';
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

function roundTrip(file, compact) {
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8'); const obj = JSON.parse(raw);
  const dump = (o) => (compact ? JSON.stringify(o) : JSON.stringify(o, null, 2)); const nl = raw.endsWith('\n') ? '\n' : '';
  if (dump(obj) + nl !== raw) return null;
  return { obj, write: (o) => fs.writeFileSync(file, dump(o) + nl) };
}
function editMfr(root, driver, mfr, op) {
  const c = roundTrip(path.join(root, 'drivers', driver, 'driver.compose.json'), false);
  const a = roundTrip(path.join(root, 'app.json'), true);
  if (!c || !a) return 'json round-trip not byte-identical';
  const ad = (a.obj.drivers || []).find((d) => d.id === driver);
  if (!ad || !ad.zigbee) return `driver ${driver} missing in app.json`;
  for (const z of [c.obj.zigbee, ad.zigbee]) {
    // R20: every Tuya fingerprint is stored in its original AND lower-case form (pairing is case-sensitive)
    if (op === 'add') for (const v of [...new Set([mfr, lc(mfr)])]) if (!z.manufacturerName.includes(v)) z.manufacturerName.push(v);
    if (op === 'remove') z.manufacturerName = z.manufacturerName.filter((m) => lc(m) !== lc(mfr));
  }
  c.write(c.obj); a.write(a.obj); return null;
}
function drivers(root) {
  const m = new Map();
  for (const d of fs.readdirSync(path.join(root, 'drivers'))) {
    const z = (readJson(path.join(root, 'drivers', d, 'driver.compose.json'), {}) || {}).zigbee;
    if (z) m.set(d, { mfrs: new Set((z.manufacturerName || []).map(lc)), pids: new Set((z.productId || []).map((p) => String(p).toUpperCase())) });
  }
  return m;
}
/**
 * OCR read-back guard (P2943): screenshot OCR swaps look-alike glyphs (i/j/l/1, o/0), e.g. the
 * Johan #451 screenshot shows _TZ3000_pmz6mjyu but OCR produced _TZ3000_pmz6miyu. A provisional id
 * that only differs from a manufacturerName already on a specific driver by such glyphs is a misread
 * of that couple, not a new device. Returns the owning driver or null.
 */
const ocrKey = (s) => lc(s).replace(/[ijl1]/g, 'i').replace(/[o0]/g, 'o');
function ocrTwin(drv, mfr) {
  const k = ocrKey(mfr);
  for (const [d, z] of drv) {
    if (HOSTS.includes(d)) continue;
    for (const m of z.mfrs) if (m !== lc(mfr) && ocrKey(m) === k) return { driver: d, mfr: m };
  }
  return null;
}
/** Pure gate for the provisional tier (unit-tested). */
function canProvision(drv, mfr, pid) {
  if (!VALID_MFR.test(mfr || '') || /x{5,}|0{6,}/i.test(mfr)) return 'not a valid manufacturerName';
  const host = drv.get(HOST); if (!host) return 'no provisional host';
  const twin = ocrTwin(drv, mfr); if (twin) return `OCR look-alike of ${twin.mfr} on ${twin.driver}`;
  if (!host.pids.has(String(pid).toUpperCase())) return `${pid} not a native productId of ${HOST}`;
  for (const [d, z] of drv) if (z.mfrs.has(lc(mfr)) && d !== HOST) return `manufacturerName already on ${d}`;
  return null;
}
/** Pure gate for an exact placement. */
function canPlace(drv, mfr, pid, driver) {
  if (!VALID_MFR.test(mfr || '')) return 'not a valid manufacturerName';
  const t = drv.get(driver); if (!t || HOSTS.includes(driver)) return 'bad target';
  if (!t.pids.has(String(pid).toUpperCase())) return `${driver} has no ${pid}`;
  for (const [d, z] of drv) {
    if (d === driver || HOSTS.includes(d) || !z.mfrs.has(lc(mfr))) continue;
    const clash = [...t.pids].find((p) => z.pids.has(p)); if (clash) return `would duplicate ${mfr}|${clash} with ${d}`;
  }
  return null;
}

function credit(root, lines) {
  if (!lines.length) return;
  const f = path.join(root, 'CREDITS.md');
  fs.appendFileSync(f, `\n- P2936 cross-research (${new Date().toISOString().slice(0, 10)}): exact couples placed from user evidence confirmed by public references (fingerprints only, own code, no copied converter logic): ${lines.join('; ')}.\n`);
}

function applyResults(root, results, { maxPlace = 50, maxProv = 50 } = {}) {
  const P = readJson(path.join(root, PFILE), { note: 'P2936 provisional tier — see docs/knowledge/CROSS_RESEARCH_P2936.md', entries: [] });
  const A = readJson(path.join(root, AFILE), { applied: [] });
  let placed = 0; let provd = 0; const skipped = []; const credits = [];
  for (const r of results) {
    for (const c of r.couples || []) {
      const drv = drivers(root);
      if (c.verdict === 'place' && placed < maxPlace) {
        const why = canPlace(drv, c.mfr, c.pid, c.driver);
        if (why) { skipped.push(`${c.mfr}|${c.pid}: ${why}`); continue; }
        const hostHad = drv.get(HOST) && drv.get(HOST).mfrs.has(lc(c.mfr));
        const err = editMfr(root, c.driver, c.mfr, 'add'); if (err) { skipped.push(err); continue; }
        if (hostHad && P.entries.some((e) => lc(e.mfr) === lc(c.mfr) && e.status === 'provisional')) editMfr(root, HOST, c.mfr, 'remove');
        A.applied.push({ mfr: c.mfr, pid: c.pid, driver: c.driver, source: r.id, refs: c.refs, via: 'cross-research', date: new Date().toISOString().slice(0, 10) });
        credits.push(`${c.mfr}/${c.pid} → ${c.driver} (${(c.refs[0] || '').replace(/^https:\/\//, '')})`);
        placed++;
      } else if (c.verdict === 'provisional' && provd < maxProv) {
        if (P.entries.some((e) => lc(e.mfr) === lc(c.mfr) && e.pid === c.pid)) continue;
        const why = canProvision(drv, c.mfr, c.pid);
        if (why) { skipped.push(`${c.mfr}|${c.pid}: ${why}`); continue; }
        const err = editMfr(root, HOST, c.mfr, 'add'); if (err) { skipped.push(err); continue; }
        P.entries.push({ mfr: c.mfr, pid: c.pid, host: HOST, status: 'provisional', confidence: c.conf, item: r.id, evidence: c.evidence, refs: c.refs, why: c.why, since: new Date().toISOString().slice(0, 10) });
        provd++;
      }
    }
  }
  fs.writeFileSync(path.join(root, PFILE), `${JSON.stringify(P, null, 1)}\n`);
  if (placed) { const raw = fs.existsSync(path.join(root, AFILE)) ? fs.readFileSync(path.join(root, AFILE), 'utf8') : ''; const ind = /^\{\n( +)/.exec(raw); fs.writeFileSync(path.join(root, AFILE), `${JSON.stringify(A, null, ind ? ind[1].length : 2)}\n`); }
  credit(root, credits);
  return { placed, provisional: provd, skipped: skipped.length };
}

/** Promotion / demotion pass, run by every workflow after cross-research. */
function promoteDemote(root, look, write) {
  const P = readJson(path.join(root, PFILE), null); if (!P) return { promoted: 0, demoted: 0 };
  const { chooseDriver } = require('../cross-research');
  let promoted = 0; let demoted = 0;
  for (const e of P.entries.filter((x) => x.status === 'provisional')) {
    const drv = drivers(root);
    const other = [...drv.entries()].find(([d, z]) => d !== HOST && z.mfrs.has(lc(e.mfr)));
    if (other) { // conflict: a specific driver now owns this manufacturerName
      if (write) editMfr(root, HOST, e.mfr, 'remove');
      Object.assign(e, { status: 'demoted', reason: `manufacturerName now on ${other[0]}`, at: new Date().toISOString().slice(0, 10) }); demoted++; continue;
    }
    const twin = ocrTwin(drv, e.mfr);
    if (twin) { // misread of an id that already has an exact couple elsewhere: drop it from the host, keep the record
      if (write) editMfr(root, HOST, e.mfr, 'remove');
      Object.assign(e, { status: 'demoted', reason: `OCR look-alike of ${twin.mfr} already on ${twin.driver}`, at: new Date().toISOString().slice(0, 10) }); demoted++; continue;
    }
    const confirmed = look && (look.byCouple.get(`${e.mfr}|${e.pid}`.toLowerCase()) || []);
    if (confirmed && confirmed.length) {
      const c = chooseDriver(drv, look, e.mfr, e.pid);
      if (c.driver && !canPlace(drv, e.mfr, e.pid, c.driver)) {
        if (write) { editMfr(root, c.driver, e.mfr, 'add'); editMfr(root, HOST, e.mfr, 'remove'); }
        Object.assign(e, { status: 'promoted', driver: c.driver, refs: confirmed.slice(0, 3).map((r) => r.url), at: new Date().toISOString().slice(0, 10) }); promoted++;
      }
    }
  }
  if (write) fs.writeFileSync(path.join(root, PFILE), `${JSON.stringify(P, null, 1)}\n`);
  return { promoted, demoted };
}

/** Feed verdicts back into the sweep SSOT (data/leads/sweep-checkpoint.json). */
function updateCheckpoint(root, results) {
  const f = path.join(root, 'data/leads/sweep-checkpoint.json'); const cp = readJson(f, null); if (!cp) return;
  const by = new Map(results.map((r) => [r.id, r]));
  const P = readJson(path.join(root, PFILE), { entries: [] });
  const hosted = new Set(P.entries.filter((e) => e.status === 'provisional').map((e) => e.item));
  const map = { place: 'fixed', covered: 'already-fixed', provisional: 'provisional' };
  for (const it of cp.items) {
    const r = by.get(it.id); if (!r || !['needs-info', 'pending', 'provisional'].includes(it.status)) continue;
    it.crossResearch = { at: new Date().toISOString().slice(0, 10), verdict: r.verdict, confidence: r.confidence,
      couples: (r.couples || []).map((c) => `${c.mfr}|${c.pid}${c.driver ? `→${c.driver}` : ''}`).slice(0, 6),
      candidates: (r.candidates || []).slice(0, 3).map((c) => c.url), sources: (r.sources || []).length };
    // provisional only when the couple is really hosted; refused by the gates = stays a lead
    if (r.verdict === 'provisional' && !hosted.has(it.id)) continue;
    if (map[r.verdict]) it.status = map[r.verdict];
  }
  cp.updated = new Date().toISOString(); fs.writeFileSync(f, `${JSON.stringify(cp, null, 2)}\n`);
}

module.exports = { HOSTS, ocrTwin, canProvision, canPlace, applyResults, promoteDemote, updateCheckpoint };
