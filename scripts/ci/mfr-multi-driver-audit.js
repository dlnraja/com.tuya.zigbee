#!/usr/bin/env node
'use strict';
/**
 * P3039d / t524u — mfr on several drivers: real couples per source vs parasitic combos.
 *
 * WHY: the truth key is the exact couple mfr+pid, never the mfr alone. A mfr can be several
 * devices (one per pid). Homey matches the cartesian mfr x pid of each driver, so a mfr listed on
 * a driver with other pids generates combos no real device reports ("parasitic").
 *
 * For every mfr (case-insensitive) present on 2+ drivers of app.json it lists:
 *   - real couples per source: Z2M (data/z2m_herdsman_cache.json: mfrs x modelIds), reviewed rules
 *     (lib/data/couple-guard.json), and the P3024b publish baseline (shipped couples, informative);
 *   - per driver, the generated combos; a combo is "parasitic" when a source knows the mfr and
 *     none lists that pid for it. Mfrs no source knows are reported as "unverified", never parasitic.
 * New parasitic combos (not in .github/mfr-multi-driver-parasitic-baseline.json) are signalled;
 * baseline ones never block. Matrix (t524u.4): multi-pid mfr count per source and, for every Z2M
 * couple shipped, whether its owner driver has the capability of the Z2M class.
 *
 * Usage: node scripts/ci/mfr-multi-driver-audit.js [--strict] [--write-baseline] [--json out.json]
 *   --strict exits 1 on NEW parasitic combos (used by test/critical/p3039d-mfr-multi-driver-audit.test.js).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const BASELINE = path.join(ROOT, '.github', 'mfr-multi-driver-parasitic-baseline.json');
const lc = (s) => String(s || '').trim().toLowerCase();
const readJson = (f, dflt) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_e) { return dflt; } };

// Z2M expose -> Homey capabilities that prove the class (any one is enough). Report only.
const CLASS_CAPS = [
  ['smoke', ['alarm_smoke']],
  ['carbon_monoxide', ['alarm_co', 'measure_co']],
  ['co', ['alarm_co', 'measure_co']],
  ['gas', ['alarm_gas', 'alarm_co', 'measure_co', 'alarm_smoke']],
  ['water_leak', ['alarm_water']],
  ['contact', ['alarm_contact']],
  ['cover_position', ['windowcoverings_set', 'windowcoverings_state', 'dim']],
  ['occupancy', ['alarm_motion', 'alarm_presence', 'alarm_occupancy']],
  ['presence', ['alarm_motion', 'alarm_presence', 'alarm_occupancy']],
  ['local_temperature', ['target_temperature', 'measure_temperature']],
  ['switch', ['onoff']],
  ['state', ['onoff']],
  ['temperature', ['measure_temperature']],
];

function sources(root) {
  const z2m = new Map(); // mfr -> Map(pid -> [{model, exposes}])
  const cache = readJson(path.join(root, 'data', 'z2m_herdsman_cache.json'), { devices: [] });
  for (const d of cache.devices || []) {
    const pids = [...d.modelIds || [], ...d.zigbeeModels || []];
    for (const m of d.mfrs || []) {
      const k = lc(m);
      if (!z2m.has(k)) {z2m.set(k, new Map());}
      for (const p of pids) {
        const pm = z2m.get(k);
        if (!pm.has(lc(p))) {pm.set(lc(p), []);}
        pm.get(lc(p)).push({ model: d.model, vendor: d.vendor, exposes: d.exposes || [] });
      }
    }
  }
  const rules = new Map(); // mfr -> Set(pid) (reviewed real couples, any driver)
  const guard = readJson(path.join(root, 'lib', 'data', 'couple-guard.json'), { drivers: {} });
  for (const e of Object.values(guard.drivers || {})) {
    for (const [m, pids] of Object.entries(e.mfrs || {})) {
      if (!rules.has(lc(m))) {rules.set(lc(m), new Set());}
      for (const p of pids) {rules.get(lc(m)).add(lc(p));}
    }
  }
  const shipped = new Map(); // mfr -> Set(pid) from P3024b baseline (cartesian, informative only)
  const base = readJson(path.join(root, 'test', 'fixtures', 'athom-last-test-package-couples.json'), { drivers: {} });
  for (const e of Object.values(base.drivers || {})) {
    for (const m of e.m || []) {
      if (!shipped.has(lc(m))) {shipped.set(lc(m), new Set());}
      for (const p of e.p || []) {shipped.get(lc(m)).add(lc(p));}
    }
  }
  return { z2m, rules, shipped };
}

function audit(manifest, root = ROOT) {
  const { z2m, rules } = sources(root);
  const byMfr = new Map(); // mfr -> Map(driverId -> {pids, forms, caps})
  for (const d of manifest.drivers || []) {
    if (!d || !d.zigbee) {continue;}
    const pids = (d.zigbee.productId || []).map(String);
    for (const m of d.zigbee.manufacturerName || []) {
      const k = lc(m);
      if (!byMfr.has(k)) {byMfr.set(k, new Map());}
      const dm = byMfr.get(k);
      if (!dm.has(d.id)) {dm.set(d.id, { pids, forms: new Set(), caps: d.capabilities || [] });}
      dm.get(d.id).forms.add(String(m));
    }
  }
  const multi = [];
  const parasitic = [];
  let unverified = 0;
  for (const [m, dm] of byMfr) {
    if (dm.size < 2) {continue;}
    const real = new Set([...z2m.get(m) ? z2m.get(m).keys() : [], ...rules.get(m) || []]);
    const known = real.size > 0;
    if (!known) {unverified += 1;}
    const drivers = [];
    for (const [id, s] of dm) {
      const para = known ? s.pids.filter((p) => !real.has(lc(p))) : [];
      for (const p of para) {parasitic.push(`${m}|${p}@${id}`);}
      drivers.push({ id, pids: s.pids, parasitic: para });
    }
    multi.push({
      mfr: m,
      real: {
        z2m: z2m.get(m) ? [...z2m.get(m).keys()] : [],
        rules: rules.get(m) ? [...rules.get(m)] : [],
      },
      drivers,
      verified: known,
    });
  }
  // Matrix (t524u.4): multi-pid mfrs per source + class check of shipped Z2M couples.
  const multiPid = { z2m: 0, rules: 0 };
  for (const pm of z2m.values()) {if (pm.size > 1) {multiPid.z2m += 1;}}
  for (const s of rules.values()) {if (s.size > 1) {multiPid.rules += 1;}}
  const classSuspects = [];
  let z2mShipped = 0;
  for (const [m, pm] of z2m) {
    const dm = byMfr.get(m);
    if (!dm) {continue;}
    for (const [p, devs] of pm) {
      const owners = [...dm].filter(([, s]) => s.pids.some((x) => lc(x) === p));
      if (!owners.length) {continue;}
      z2mShipped += 1;
      const ex = new Set(devs.flatMap((d) => d.exposes));
      const rule = CLASS_CAPS.find(([e]) => ex.has(e));
      if (!rule) {continue;}
      for (const [id, s] of owners) {
        const ok = s.caps.some((c) => rule[1].includes(String(c).split('.')[0]));
        if (!ok) {classSuspects.push(`${m}|${p}@${id} (Z2M ${devs[0].model}: ${rule[0]})`);}
      }
    }
  }
  return { multi, parasitic: [...new Set(parasitic)].sort(), unverified, multiPid, z2mShipped, classSuspects: classSuspects.sort() };
}

function main(argv) {
  const manifest = readJson(path.join(ROOT, 'app.json'), { drivers: [] });
  const r = audit(manifest);
  const base = readJson(BASELINE, { parasitic: [] });
  const known = new Set(base.parasitic || []);
  const fresh = r.parasitic.filter((k) => !known.has(k));
  const fixed = (base.parasitic || []).filter((k) => !r.parasitic.includes(k));
  if (argv.includes('--write-baseline')) {
    fs.writeFileSync(BASELINE, `${JSON.stringify({
      _why: 'P3039d / t524u: parasitic mfr x pid combos (mfr on 2+ drivers, pid no source lists for it) accepted at baseline time; scripts/ci/mfr-multi-driver-audit.js signals only NEW ones. Shrink it, never grow it without review.',
      generated: new Date().toISOString().slice(0, 10),
      parasitic: r.parasitic,
    }, null, 1)}\n`);
  }
  const ji = argv.indexOf('--json');
  if (ji >= 0 && argv[ji + 1]) {fs.writeFileSync(argv[ji + 1], JSON.stringify({ ...r, fresh, fixed }, null, 1));}
  console.log(`[mfr-multi-driver] mfrs on 2+ drivers: ${r.multi.length} (unverified by any source: ${r.unverified})`);
  console.log(`[mfr-multi-driver] parasitic combos: ${r.parasitic.length} (baseline ${known.size}, new ${fresh.length}, resolved ${fixed.length})`);
  console.log(`[mfr-multi-driver] multi-pid mfrs: Z2M ${r.multiPid.z2m}, reviewed rules ${r.multiPid.rules}; Z2M couples shipped ${r.z2mShipped}, class suspects ${r.classSuspects.length}`);
  for (const k of fresh) {console.log(`  NEW parasitic ${k}`);}
  if (argv.includes('--strict') && fresh.length) {return 1;}
  return 0;
}

module.exports = { audit };
if (require.main === module) {process.exitCode = main(process.argv.slice(2));}
