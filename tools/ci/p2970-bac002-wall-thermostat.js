'use strict';

/**
 * p2970-bac002-wall-thermostat.js (P2970)
 *
 * WHY(P2970, Umberto Maffii store suggestion "Beca BAC-006AZB pairs but is not a thermostat"):
 *   Z2M herdsman tuya.ts declares BAC-002-ALZB (whitelabel Beca BAC-003) on
 *   TS0601 + `_TZE200_dzuqwsyg` / `_TZE204_dzuqwsyg`; Z2M discussion #25308
 *   confirms the Beca BAC-006AZB fan-coil thermostat reports `_TZE204_dzuqwsyg`.
 *   This app had `_TZE204_dzuqwsyg` in switch_1gang (on/off only) and
 *   `_TZE200_dzuqwsyg` in device_radiator_valve (TRV DP map) — both wrong class.
 *   They are moved (not duplicated) to wall_thermostat, whose FCU path now has a
 *   BAC-002 sub-profile (see drivers/wall_thermostat/device.js).
 *
 * Idempotent. Usage:
 *   node tools/ci/p2970-bac002-wall-thermostat.js          # apply
 *   node tools/ci/p2970-bac002-wall-thermostat.js --check  # exit 1 if not applied
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const TARGET = 'wall_thermostat';
const BASES = ['_TZE200_dzuqwsyg', '_TZE204_dzuqwsyg'];
const CHECK = process.argv.includes('--check');

/** Same four case variants the other wall_thermostat couples carry. */
function variants(base) {
  const [, prefix, suffix] = base.match(/^(_[A-Za-z0-9]+_)(.+)$/);
  const P = prefix.toUpperCase();
  const p = prefix.toLowerCase();
  const s = suffix.toLowerCase();
  const S = suffix.toUpperCase();
  return [P + s, p + s, P + S, p + S];
}

const ALL = new Set(BASES.flatMap(variants));
const isOurs = (m) => ALL.has(m);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

const PIN_ID = 'p2970-bac002-beca-dzuqwsyg';
const SRC = 'Z2M zigbee-herdsman-converters tuya.ts BAC-002-ALZB (fingerprints _TZE200_dzuqwsyg/_TZE204_dzuqwsyg, whitelabel Beca BAC-003) + Koenkk/zigbee2mqtt discussion #25308 (Beca BAC-006AZB = _TZE204_dzuqwsyg)';

/** Pins, curated removals, catch-all and mfs_db hints so bots never move the couples back. */
function syncGuardData() {
  let changes = 0;
  const rd = (rel) => {
    const f = path.join(ROOT, rel);
    if (!fs.existsSync(f)) { return null; }
    const raw = fs.readFileSync(f, 'utf8');
    return { f, raw, data: JSON.parse(raw) };
  };
  const wr = (o, pretty) => {
    changes++;
    if (CHECK) { return; }
    const nl = o.raw.endsWith('\n') ? '\n' : '';
    fs.writeFileSync(o.f, (pretty ? JSON.stringify(o.data, null, 2) : JSON.stringify(o.data)) + nl);
  };

  const pins = rd('config/architecture/couple-driver-pins.json');
  if (pins && Array.isArray(pins.data.pins) && !pins.data.pins.some((p) => p.id === PIN_ID)) {
    pins.data.pins.push({
      id: PIN_ID,
      mfr: [...ALL],
      driver: TARGET,
      pid: 'TS0601',
      source: SRC,
      regression: 'P2970 2026-10-24: _TZE204_dzuqwsyg sat in switch_1gang (paired as a relay) and _TZE200_dzuqwsyg in device_radiator_valve (TRV DP map); store suggestion by Umberto Maffii: BAC-006AZB pairs but is not a thermostat.',
    });
    wr(pins, true);
    console.log('[P2970] pin added');
  }

  const rem = rd('config/architecture/curated-couple-removals.json');
  if (rem && Array.isArray(rem.data.removals)) {
    let touched = false;
    for (const [drv, base] of [['switch_1gang', '_TZE204_dzuqwsyg'], ['device_radiator_valve', '_TZE200_dzuqwsyg'], ['switch_1gang', '_TZE200_dzuqwsyg'], ['device_radiator_valve', '_TZE204_dzuqwsyg']]) {
      if (rem.data.removals.some((r) => r.driver === drv && (r.mfr || []).some((m) => m.toLowerCase() === base.toLowerCase()))) { continue; }
      rem.data.removals.push({
        driver: drv,
        mfr: variants(base),
        why: `2026-10-24 P2970: ${base} is a Beca BAC-002/BAC-006AZB fan-coil wall thermostat (TS0601), not a ${drv === 'switch_1gang' ? 'relay' : 'radiator valve'}; moved to wall_thermostat (pinned).`,
        source: `P2970 ${SRC}`,
      });
      touched = true;
    }
    if (touched) { wr(rem, true); console.log('[P2970] curated removals added'); }
  }

  const ca = rd('data/sacred-couple-catch-all.json');
  if (ca && Array.isArray(ca.data.catchall)) {
    const kept = ca.data.catchall.filter((m) => !isOurs(m));
    if (kept.length !== ca.data.catchall.length) { ca.data.catchall = kept; wr(ca, true); console.log('[P2970] catch-all cleaned'); }
  }

  const mfs = rd('data/mfs_db.json');
  if (mfs) {
    let touched = false;
    const d = mfs.data;
    for (const base of BASES) {
      const lo = base.toLowerCase();
      const dev = d.devices && d.devices[lo];
      if (dev && dev.driverHint !== TARGET) { dev.driverHint = TARGET; dev.deviceType = 'thermostat'; touched = true; }
      const top = d[base];
      if (top && top.driverId !== TARGET) { Object.assign(top, { driverId: TARGET, source: 'P2970', modelIds: ['TS0601'], pid: 'TS0601', modelIdsCount: 1 }); touched = true; }
      const sc = d.sacredCouples || {};
      const k = `${lo}|ts0601`;
      if (sc[k] && sc[k].driver !== TARGET) { sc[k].driver = TARGET; touched = true; }
      if (sc[base] && sc[base].driverId !== TARGET) { sc[base].driverId = TARGET; touched = true; }
    }
    if (touched) { wr(mfs, false); console.log('[P2970] mfs_db hints -> wall_thermostat'); }
  }
  return changes;
}

function main() {
  const driversDir = path.join(ROOT, 'drivers');
  let dirty = 0;
  for (const id of fs.readdirSync(driversDir)) {
    const file = path.join(driversDir, id, 'driver.compose.json');
    if (!fs.existsSync(file)) {continue;}
    const d = readJson(file);
    const z = d.zigbee;
    if (!z || !Array.isArray(z.manufacturerName)) {continue;}
    if (id === TARGET) {
      const missing = [...ALL].filter((m) => !z.manufacturerName.includes(m));
      if (missing.length) {
        dirty++;
        if (!CHECK) {
          z.manufacturerName.push(...missing);
          if (!z.productId.includes('TS0601')) {z.productId.push('TS0601');}
          writeJson(file, d);
        }
        console.log(`[P2970] ${id}: +${missing.length}`);
      }
      continue;
    }
    const before = z.manufacturerName.length;
    const kept = z.manufacturerName.filter((m) => !isOurs(m));
    if (kept.length !== before) {
      dirty++;
      if (!CHECK) {
        z.manufacturerName = kept;
        writeJson(file, d);
      }
      console.log(`[P2970] ${id}: -${before - kept.length} (wrong class for BAC-002/BAC-006AZB)`);
    }
  }

  // Runtime fingerprint DB (source of lib/tuya/fp-shards)
  const fpFile = path.join(ROOT, 'lib', 'tuya', 'fingerprints.json');
  if (fs.existsSync(fpFile)) {
    const db = readJson(fpFile);
    let touched = false;
    for (const base of BASES) {
      const want = { driverId: TARGET, type: 'thermostat', powerSource: 'mains', modelIds: ['TS0601'] };
      const cur = db[base];
      if (!cur || cur.driverId !== TARGET || cur.powerSource !== 'mains') {
        dirty++;
        touched = true;
        db[base] = Object.assign({}, cur || {}, want);
        console.log(`[P2970] fingerprints.json ${base} -> ${TARGET}`);
      }
    }
    if (touched && !CHECK) {fs.writeFileSync(fpFile, JSON.stringify(db));}
  }

  // Generated app.json: mirror the same move without a full `homey app build` (which needs Node 22
  // and rewrites the whole file). Only manufacturerName arrays of affected drivers are touched.
  const appFile = path.join(ROOT, 'app.json');
  if (fs.existsSync(appFile)) {
    const raw = fs.readFileSync(appFile, 'utf8');
    const app = JSON.parse(raw);
    let appTouched = false;
    for (const drv of app.drivers || []) {
      const z = drv.zigbee;
      if (!z || !Array.isArray(z.manufacturerName)) {continue;}
      if (drv.id === TARGET) {
        const missing = [...ALL].filter((m) => !z.manufacturerName.includes(m));
        if (missing.length) { z.manufacturerName.push(...missing); appTouched = true; }
        if (Array.isArray(z.productId) && !z.productId.includes('TS0601')) { z.productId.push('TS0601'); appTouched = true; }
      } else {
        const kept = z.manufacturerName.filter((m) => !isOurs(m));
        if (kept.length !== z.manufacturerName.length) { z.manufacturerName = kept; appTouched = true; }
      }
    }
    if (appTouched) {
      dirty++;
      console.log('[P2970] app.json synced');
      if (!CHECK) {fs.writeFileSync(appFile, JSON.stringify(app, null, 2) + (raw.endsWith('\n') ? '\n' : ''));}
    }
  }

  dirty += syncGuardData();

  if (CHECK && dirty) {
    console.error(`[P2970] ${dirty} pending change(s)`);
    process.exit(1);
  }
  console.log(CHECK ? '[P2970] OK' : `[P2970] applied (${dirty} change(s))`);
}

if (require.main === module) {main();}
module.exports = { variants, BASES, TARGET };
