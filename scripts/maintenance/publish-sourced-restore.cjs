'use strict';
// WHY(P3201, 02/11/2026 Paris): the publish payload hit its cap (master 15 498/15 500, bastien-home 15 500/15 500)
// and real, source-backed couples fell out of it (#584, #581: "Unknown Zigbee device"; 10 more on 02/11 after the
// P3200 pins). Root cause: the room was spent on parasites, not on devices:
//   - case forms nobody reports: Tuya devices send the canonical form (prefix upper, suffix lower). 3 157 of 3 160
//     upstream couples (data/kb/couples.json) and 41/41 couples read from user diags use it, yet composes carry up
//     to 4 manufacturer forms x 3 productId forms (_tz3000_x / _TZ3000_X ... x TS0201 / ts0201 / Ts0201) and the
//     P3024b baseline pinned all of them;
//   - cartesian cross-products (mfr x pid) that no source pairs.
// This pass runs on the PAYLOAD only (never on driver composes or runtime matching, so source support and paired
// devices are untouched), after compaction and the TS0601 top-up:
//   1. dedupe: per driver, drop case/invisible-char duplicate forms that are neither canonical nor quoted exactly by
//      a source; never the last form of a couple, never an exact sacred pin;
//   2. restore: put back every source-backed couple of the compose that is in no payload driver, best benefit/cost
//      first; when the ceiling is hit, make room only by removing whole parasite rows (a pid or a manufacturer of a
//      driver that pairs with no source-backed couple there, sacred pins excluded); a couple is decided per exact
//      mfr+pid, never per manufacturer;
//   3. report what is still out, so CI can fail on any dropped must-keep couple (scripts/ci/publish-sourced-gate.cjs).
const fs = require('fs');
const path = require('path');

const lc = (s) => String(s).toLowerCase();
const uc = (s) => String(s).toUpperCase();
// eslint-disable-next-line no-control-regex
const INVISIBLE_RE = /[\u0000-\u001f\u007f\u00a0\u200b-\u200f\u2028-\u202f\u2060\ufeff]/g;
const clean = (s) => String(s).replace(INVISIBLE_RE, '').trim();
const keyOf = (m, p) => `${lc(clean(m))}|${uc(clean(p))}`;
const arr = (v) => (Array.isArray(v) ? v : []).filter((x) => typeof x === 'string' && x.length > 0);

/** Canonical Tuya wire form: prefix up to the last "_" upper case, suffix lower case (_TZ3000_yupc0pb7). */
function canonicalMfr(m) {
  const s = clean(m);
  const i = s.lastIndexOf('_');
  if (!/^_t/i.test(s) || i <= 0) return s;
  return uc(s.slice(0, i + 1)) + lc(s.slice(i + 1));
}
/** Canonical productId: TSxxxx ids are upper case on the wire; other ids keep their own form. */
function canonicalPid(p) {
  const s = clean(p);
  return /^ts[0-9a-z]+$/i.test(s) || /^tso[0-9a-z]+$/i.test(s) ? uc(s) : s;
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

/**
 * Source-backed couples. key "mfr_lc|PID_UC" -> { mfrForms:Set exact, pidForms:Set exact, src:Set, strong:boolean }.
 * strong = upstream projects (data/kb/couples.json), user diags (data/diag-ids.json) or sacred pins;
 * weak = observed in data/mfs_db.json only.
 */
function loadSourcedCouples(repoRoot) {
  const out = new Map();
  const add = (m, p, src, strong) => {
    if (!m || !p) return;
    const k = keyOf(m, p);
    if (k.startsWith('|') || k.endsWith('|')) return;
    let e = out.get(k);
    if (!e) { e = { mfrForms: new Set(), pidForms: new Set(), src: new Set(), strong: false }; out.set(k, e); }
    e.mfrForms.add(clean(m)); e.pidForms.add(clean(p)); e.src.add(src); e.strong = e.strong || strong;
  };
  const kb = readJson(path.join(repoRoot, 'data', 'kb', 'couples.json'));
  for (const k of Object.keys((kb && kb.couples) || {})) {
    const i = k.lastIndexOf('|');
    if (i > 0) add(k.slice(0, i), k.slice(i + 1), 'kb', true);
  }
  const diag = readJson(path.join(repoRoot, 'data', 'diag-ids.json'));
  for (const r of (diag && diag.reports) || []) for (const c of r.couples || []) add(c[0], c[1], 'diag', true);
  const sacred = readJson(path.join(repoRoot, 'config', 'architecture', 'publish-sacred-keep-couples.json'));
  for (const c of (sacred && sacred.couples) || []) add(c.mfr, c.pid || c.productId || c.modelId, 'sacred', true);
  const db = readJson(path.join(repoRoot, 'data', 'mfs_db.json')) || {};
  const seen = new Set();
  const addDb = (info, key) => {
    if (!info || typeof info !== 'object' || !Array.isArray(info.modelIds)) return;
    const m = info.manufacturerId || key;
    if (/needs_device_assignment|^_generic_|^_hybrid_|unknown|dummy|placeholder/i.test(m)) return;
    for (const p of info.modelIds) {
      const k = keyOf(m, p);
      if (seen.has(k)) continue; seen.add(k); add(m, p, 'mfs_db', false);
    }
  };
  for (const [k, v] of Object.entries(db.devices || {})) addDb(v, k);
  for (const [k, v] of Object.entries(db)) if (!['_meta', 'sources', 'devices', 'driverMapping', 'stats', 'diff'].includes(k)) addDb(v, k);
  return out;
}

function sacredExact(repoRoot) {
  const raw = readJson(path.join(repoRoot, 'config', 'architecture', 'publish-sacred-keep-couples.json'));
  const s = new Set();
  for (const c of (raw && raw.couples) || []) s.add(`${c.driverId}#${c.mfr}#${uc(c.pid || c.productId || c.modelId)}`);
  return s;
}

const zig = (d) => d && d.zigbee && Array.isArray(d.zigbee.manufacturerName) && Array.isArray(d.zigbee.productId);
const total = (man) => (man.drivers || []).reduce((s, d) => s + (zig(d) ? d.zigbee.manufacturerName.length * d.zigbee.productId.length : 0), 0);

/** keys present in any payload driver (caseless; exactness is handled by the canonical-form rule). */
function presentKeys(man) {
  const s = new Set();
  for (const d of man.drivers || []) {
    if (!zig(d)) continue;
    const ps = d.zigbee.productId.map((p) => uc(clean(p)));
    for (const m of d.zigbee.manufacturerName) { const l = lc(clean(m)); for (const p of ps) s.add(`${l}|${p}`); }
  }
  return s;
}
/** Wire-exact presence: the canonical (or a source-quoted) form of both sides is in the same driver. */
function wireKeys(man, sourced) {
  const s = new Set();
  for (const d of man.drivers || []) {
    if (!zig(d)) continue;
    for (const m of d.zigbee.manufacturerName) {
      for (const p of d.zigbee.productId) {
        const k = keyOf(m, p);
        const e = sourced && sourced.get(k);
        const mOk = m === canonicalMfr(m) || (e && e.mfrForms.has(m));
        const pOk = p === canonicalPid(p) || (e && e.pidForms.has(p));
        if (mOk && pOk) s.add(k);
      }
    }
  }
  return s;
}

/** Step 1: case/invisible duplicates. Returns combos freed. */
// P3201: exact rows carrying a P3024b baseline couple (byte-exact, as checkBaseline) are never cut.
function baselineRows(man, baselineSet) {
  const rows = new Set();
  if (!baselineSet || !baselineSet.size) return rows;
  for (const d of man.drivers || []) {
    if (!zig(d)) continue;
    for (const m of d.zigbee.manufacturerName) for (const p of d.zigbee.productId) {
      if (baselineSet.has(`${m}\u0000${p}`)) { rows.add(`${d.id}#M#${m}`); rows.add(`${d.id}#P#${p}`); }
    }
  }
  return rows;
}

function dedupeForms(man, sourced, sacred, prot = new Set()) {
  const before = total(man);
  for (const d of man.drivers || []) {
    if (!zig(d)) continue;
    const keepForm = (list, canon, quoted, isPid) => {
      const groups = new Map();
      for (const v of list) {
        const g = isPid ? uc(clean(v)) : lc(clean(v));
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(v);
      }
      const next = [];
      for (const [g, forms] of groups) {
        const uniq = [...new Set(forms)];
        if (uniq.length === 1 && uniq[0] === clean(uniq[0])) { next.push(uniq[0]); continue; }
        const keep = uniq.filter((v) => isSacred(d.id, v, isPid) || (v === clean(v) && (v === canon(v) || quoted(g, v))));
        if (keep.length === 0) {
          // no canonical form present: add it (same count) instead of keeping a non-wire form
          next.push(canon(uniq[0]));
        } else {
          // canonical first, then at most one sourced alternate; sacred exact forms always kept
          const canonFirst = keep.sort((a, b) => (b === canon(b)) - (a === canon(a)));
          const kept = [];
          for (const v of canonFirst) {
            if (isSacred(d.id, v, isPid) || kept.length < 2 && (v === canon(v) || kept.length === 0 || quoted(g, v))) kept.push(v);
          }
          next.push(...kept);
        }
      }
      return [...new Set(next)];
    };
    const mfrQuoted = new Map(); const pidQuoted = new Map();
    for (const [k, e] of sourced) {
      const [m, p] = [k.slice(0, k.lastIndexOf('|')), k.slice(k.lastIndexOf('|') + 1)];
      for (const f of e.mfrForms) { if (!mfrQuoted.has(m)) mfrQuoted.set(m, new Set()); mfrQuoted.get(m).add(f); }
      for (const f of e.pidForms) { if (!pidQuoted.has(p)) pidQuoted.set(p, new Set()); pidQuoted.get(p).add(f); }
    }
    function isSacred(id, v, isPid) {
      if (prot.has(`${id}#${isPid ? 'P' : 'M'}#${v}`)) return true;
      if (isPid) { for (const s of sacred) if (s.startsWith(`${id}#`) && s.endsWith(`#${uc(v)}`)) return true; return false; }
      for (const s of sacred) if (s.startsWith(`${id}#${v}#`)) return true;
      return false;
    }
    d.zigbee.manufacturerName = keepForm(d.zigbee.manufacturerName, canonicalMfr, (g, v) => (mfrQuoted.get(g) || new Set()).has(v), false);
    d.zigbee.productId = keepForm(d.zigbee.productId, canonicalPid, (g, v) => (pidQuoted.get(g) || new Set()).has(v), true);
  }
  return before - total(man);
}

/** Step 2: restore source-backed couples of the compose, freeing room only from parasite rows. */
function restoreSourced(source, man, sourced, sacred, { prot = new Set(), maxTotal, maxDriver = Infinity, log = () => {}, ratchet = null } = {}) {
  const payById = new Map((man.drivers || []).filter(zig).map((d) => [d.id, d]));
  // compose driver per missing key (first driver in manifest order that lists it, payload drivers only)
  const want = new Map(); // key -> driverId
  for (const sd of source.drivers || []) {
    if (!zig(sd) || !payById.has(sd.id)) continue;
    const ps = sd.zigbee.productId.map((p) => uc(clean(p)));
    for (const m of sd.zigbee.manufacturerName) {
      const l = lc(clean(m));
      for (const p of ps) { const k = `${l}|${p}`; if (sourced.has(k) && !want.has(k)) want.set(k, sd.id); }
    }
  }
  const sourcedIn = (d) => {
    // per row usage count of source-backed couples in driver d
    const mRow = new Map(); const pRow = new Map();
    for (const m of d.zigbee.manufacturerName) for (const p of d.zigbee.productId) {
      if (!sourced.has(keyOf(m, p))) continue;
      mRow.set(m, (mRow.get(m) || 0) + 1); pRow.set(p, (pRow.get(p) || 0) + 1);
    }
    return { mRow, pRow };
  };
  const pinM = new Set(); const pinP = new Set();
  for (const s of sacred) { const [id, m, p] = s.split('#'); pinM.add(`${id}#${m}`); pinP.add(`${id}#${p}`); }
  let cur = total(man);
  // parasite rows: zero source-backed couples, not sacred-pinned. Removing one never changes another's status.
  let cand = null;
  const buildCand = () => {
    cand = [];
    for (const d of payById.values()) {
      const { mRow, pRow } = sourcedIn(d);
      for (const m of d.zigbee.manufacturerName) if (!mRow.get(m) && !pinM.has(`${d.id}#${m}`) && !prot.has(`${d.id}#M#${m}`)) cand.push({ d, v: m, isPid: false });
      for (const p of d.zigbee.productId) if (!pRow.get(p) && !pinP.has(`${d.id}#${uc(p)}`) && !prot.has(`${d.id}#P#${p}`)) cand.push({ d, v: p, isPid: true });
    }
  };
  const gainOf = (c) => {
    const z = c.d.zigbee; const own = c.isPid ? z.productId : z.manufacturerName;
    if (own.length <= 1 || !own.includes(c.v)) return 0;
    return c.isPid ? z.manufacturerName.length : z.productId.length;
  };
  const freeRoom = (need, protectId) => {
    if (!cand) buildCand();
    let freed = 0;
    while (freed < need) {
      let best = null; let bestG = 0; let fit = null; let fitG = Infinity;
      for (const c of cand) {
        if (c.d.id === protectId) continue;
        const g = gainOf(c); if (!g) continue;
        if (g > bestG) { best = c; bestG = g; }
        if (g >= need - freed && g < fitG) { fit = c; fitG = g; }
      }
      const pick = fit || best; if (!pick) break;
      const g = fit ? fitG : bestG; const z = pick.d.zigbee;
      if (pick.isPid) z.productId = z.productId.filter((x) => x !== pick.v);
      else z.manufacturerName = z.manufacturerName.filter((x) => x !== pick.v);
      freed += g; cur -= g;
    }
    return freed >= need;
  };
  const present = presentKeys(man);
  const missing = [...want.entries()].filter(([k]) => !present.has(k));
  // strong first, then cheapest
  const costOf = (k, id) => {
    const d = payById.get(id); const [m, p] = [k.slice(0, k.lastIndexOf('|')), k.slice(k.lastIndexOf('|') + 1)];
    const hasM = d.zigbee.manufacturerName.some((x) => lc(clean(x)) === m);
    const hasP = d.zigbee.productId.some((x) => uc(clean(x)) === p);
    const M = d.zigbee.manufacturerName.length; const P = d.zigbee.productId.length;
    return hasM && hasP ? 0 : hasM ? M : hasP ? P : M + P + 1;
  };
  // P3201b: committed-snapshot couples first (the ratchet gate FATALs if one is out), then strong, then cheapest.
  // Without this, budget-edge ordering let a cheaper non-snapshot couple take the last slot (CI run 41402776968).
  const inSnap = (k) => (ratchet && ratchet.has(k) ? 1 : 0); // eslint-disable-line no-extra-parens
  missing.sort((a, b) => (inSnap(b[0]) - inSnap(a[0])) || (sourced.get(b[0]).strong - sourced.get(a[0]).strong) || (costOf(a[0], a[1]) - costOf(b[0], b[1])));
  let restored = 0; const still = [];
  for (const [k, id] of missing) {
    if (presentKeys({ drivers: [payById.get(id)] }).has(k)) { restored++; continue; }
    const d = payById.get(id); const e = sourced.get(k);
    const cost = costOf(k, id);
    const M = d.zigbee.manufacturerName.length; const P = d.zigbee.productId.length;
    if (M * P + cost > maxDriver) { still.push({ key: k, driver: id, why: 'driver-cap' }); continue; }
    if (cur + cost > maxTotal && !freeRoom(cur + cost - maxTotal, id)) { still.push({ key: k, driver: id, why: 'ceiling' }); continue; }
    const [m, p] = [k.slice(0, k.lastIndexOf('|')), k.slice(k.lastIndexOf('|') + 1)];
    const pickM = [...e.mfrForms].find((f) => f === canonicalMfr(f)) || canonicalMfr([...e.mfrForms][0] || m);
    const pickP = [...e.pidForms].find((f) => f === canonicalPid(f)) || canonicalPid([...e.pidForms][0] || p);
    if (!d.zigbee.manufacturerName.some((x) => lc(clean(x)) === m)) d.zigbee.manufacturerName.push(pickM);
    if (!d.zigbee.productId.some((x) => uc(clean(x)) === p)) d.zigbee.productId.push(pickP);
    // P3201b: the rows now carry a source-backed couple, so they stop being parasites. The candidate list is
    // built once, so drop them from it; otherwise a later freeRoom removed a row a restore had just reused
    // (_tze200_9caxna4s|TS0301 reached the payload, then lost its mfr row; CI run 41402776968).
    if (cand) cand = cand.filter((c) => c.d !== d || (c.isPid ? uc(clean(c.v)) !== p : lc(clean(c.v)) !== m));
    cur = total(man); restored++;
  }
  log(`[P3201] restored ${restored} source-backed couple(s); ${still.length} still out; total ${cur}/${maxTotal}`);
  return { restored, still, total: cur };
}

/** Full pass. source = uncompacted manifest; man = payload (mutated). */
function sourcedPass(source, man, opts = {}) {
  const repoRoot = opts.repoRoot || path.join(__dirname, '..', '..');
  const sourced = opts.sourced || loadSourcedCouples(repoRoot);
  const sacred = opts.sacred || sacredExact(repoRoot);
  let baselineSet = opts.baselineSet;
  if (!baselineSet) {
    const cz = require('./compact-zigbee-identifiers.cjs');
    const b = cz.loadPublishBaseline(repoRoot);
    baselineSet = new Set(b ? cz.baselineCouples(b).map((c) => `${c.mfr}\u0000${c.pid}`) : []);
  }
  const prot = baselineRows(man, baselineSet);
  const before = total(man);
  const deduped = dedupeForms(man, sourced, sacred, prot);
  const r = restoreSourced(source, man, sourced, sacred, { ...opts, prot });
  const srcKeys = presentKeys(source);
  const payKeys = presentKeys(man);
  const wire = wireKeys(man, sourced);
  const droppedSourced = [];
  for (const [k, e] of sourced) if (srcKeys.has(k) && !(payKeys.has(k) && wire.has(k))) droppedSourced.push({ key: k, strong: e.strong, src: [...e.src] });
  return { before, deduped, restored: r.restored, after: total(man), maxTotal: opts.maxTotal, still: r.still, droppedSourced, sourcedInSource: [...sourced.keys()].filter((k) => srcKeys.has(k)).length };
}

function strongStats(source, man, sourced) {
  const sk = presentKeys(source); const pk = presentKeys(man); const w = wireKeys(man, sourced);
  const inPayload = [];
  let strongInSource = 0;
  for (const [k, e] of sourced) {
    if (!e.strong || !sk.has(k)) continue;
    strongInSource++;
    if (pk.has(k) && w.has(k)) inPayload.push(k);
  }
  return { strongInSource, inPayload: inPayload.sort() };
}

function snapshotFile(repoRoot, branch) {
  const b = String(branch || '').replace(/^refs\/heads\//, '').replace(/[^A-Za-z0-9._-]/g, '_');
  return b ? path.join(repoRoot, 'data', 'publish', `sourced-payload-snapshot-${b}.json`) : null;
}

/** Ratchet: every strong couple of the committed snapshot that is still in the source must stay in the payload. */
function checkSnapshot(source, man, sourced, file) {
  const snap = file && readJson(file);
  if (!snap || !Array.isArray(snap.couples)) return { missing: [], checked: 0 };
  const sk = presentKeys(source); const pk = presentKeys(man); const w = wireKeys(man, sourced);
  const missing = [];
  let checked = 0;
  for (const k of snap.couples) {
    if (!sk.has(k) || !sourced.has(k)) continue; // removed from source on purpose: not a publish drop
    checked++;
    if (!(pk.has(k) && w.has(k))) missing.push(`${k} (in snapshot ${path.basename(file)}, dropped from payload)`);
  }
  return { missing, checked };
}

function sourcedPassFile(source, destAppJson, opts = {}) {
  const repoRoot = opts.repoRoot || path.join(__dirname, '..', '..');
  const man = JSON.parse(fs.readFileSync(destAppJson, 'utf8'));
  const sourced = loadSourcedCouples(repoRoot);
  const sacred = sacredExact(repoRoot);
  const driversBefore = (man.drivers || []).length;
  const snapDoc = opts.ratchet ? null : readJson(snapshotFile(repoRoot, opts.branch) || '');
  const ratchet = opts.ratchet || new Set(snapDoc && Array.isArray(snapDoc.couples) ? snapDoc.couples : []);
  const r = sourcedPass(source, man, { ...opts, repoRoot, sourced, sacred, ratchet });
  const sacredMissing = [];
  const exact = new Set();
  for (const d of man.drivers || []) if (zig(d)) for (const m of d.zigbee.manufacturerName) for (const p of d.zigbee.productId) exact.add(`${d.id}#${m}#${uc(p)}`);
  for (const s of sacred) if (!exact.has(s)) sacredMissing.push(`sacred ${s}`);
  const st = strongStats(source, man, sourced);
  const snap = checkSnapshot(source, man, sourced, snapshotFile(repoRoot, opts.branch));
  fs.writeFileSync(destAppJson, JSON.stringify(man));
  return { ...r, driversBefore, driversAfter: (man.drivers || []).length, sacredMissing, strongIn: st.inPayload.length, strongInSource: st.strongInSource, strongKeys: st.inPayload, snapshotMissing: snap.missing, snapshotChecked: snap.checked };
}

module.exports = { strongStats, snapshotFile, checkSnapshot, sourcedPassFile, canonicalMfr, canonicalPid, keyOf, loadSourcedCouples, sacredExact, dedupeForms, restoreSourced, sourcedPass, presentKeys, wireKeys, total };

// CLI: node scripts/maintenance/publish-sourced-restore.cjs --snapshot <payload app.json> <branch>
//      node scripts/maintenance/publish-sourced-restore.cjs --check <payload app.json> <branch>
// The snapshot only grows by a deliberate commit; --check is the CI gate (exit 1 on a dropped couple).
if (require.main === module) {
  const [mode, payloadFile, branch] = process.argv.slice(2);
  const repoRoot = path.join(__dirname, '..', '..');
  if (!['--snapshot', '--check'].includes(mode) || !payloadFile || !branch) {
    console.error('usage: publish-sourced-restore.cjs --snapshot|--check <payload app.json> <branch>');
    process.exit(2);
  }
  const source = JSON.parse(fs.readFileSync(path.join(repoRoot, 'app.json'), 'utf8'));
  const man = JSON.parse(fs.readFileSync(payloadFile, 'utf8'));
  const sourced = loadSourcedCouples(repoRoot);
  const file = snapshotFile(repoRoot, branch);
  const st = strongStats(source, man, sourced);
  if (mode === '--snapshot') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify({ _meta: { what: 'P3201 strong source-backed couples (kb/diag/sacred, caseless key) present in the publish payload; ratchet, never shrink without a reason', branch, strongInSource: st.strongInSource, count: st.inPayload.length }, couples: st.inPayload }, null, 1)}\n`);
    console.log(`[P3201] snapshot ${path.relative(repoRoot, file)}: ${st.inPayload.length}/${st.strongInSource}`);
  } else {
    const r = checkSnapshot(source, man, sourced, file);
    console.log(`[P3201] gate ${branch}: ${r.checked} snapshot couple(s) checked, ${r.missing.length} dropped; strong in payload ${st.inPayload.length}/${st.strongInSource}`);
    for (const m of r.missing.slice(0, 50)) console.error(`  - ${m}`);
    process.exit(r.missing.length ? 1 : 0);
  }
}
