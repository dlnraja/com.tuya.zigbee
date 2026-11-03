'use strict';

/**
 * P3264 fit-347: hosted profiles.
 *
 * WHY: Athom refuses every build with more than 347 drivers (observed, ticket 157057). A held,
 * never-published driver ships its exact couples inside a published "dormant slot" driver id
 * (config/architecture/hosted-profiles.json). This module:
 *  - resolve(hostId, mfr, pid): exact couple (case-insensitive) first, then a productId owned by
 *    exactly one hosted profile of that host; otherwise null (the host keeps its own device class);
 *  - mapDeviceClass(hostId, device, fallback): the host driver's onMapDeviceClass;
 *  - foldHosted(manifest, table, heldIds): publish-time fold, collision-checked against every
 *    other driver of the manifest (Homey matches manufacturerName x productId per driver).
 * Nothing is written to the device at pairing; the class change is a one-shot migration.
 */
const lc = (s) => String(s == null ? '' : s).trim().toLowerCase();
const arr = (v) => Array.isArray(v) ? v : v ? [v] : [];

let TABLE = null;
function table() {
  if (!TABLE) {
    try { TABLE = require('./hosted-profiles.runtime.json'); } catch (_e) { TABLE = { hosts: {} }; }
  }
  return TABLE;
}

function resolve(hostId, mfr, pid, t = table()) {
  const profiles = (t.hosts && t.hosts[hostId]) || [];
  const m = lc(mfr); const p = lc(pid);
  if (!profiles.length || !p) {return null;}
  for (const pr of profiles) {
    if (pr.manufacturerName.some((x) => lc(x) === m) && pr.productId.some((x) => lc(x) === p)) {return pr;}
  }
  const byPid = profiles.filter((pr) => pr.productId.some((x) => lc(x) === p));
  return byPid.length === 1 && p !== 'ts0601' ? byPid[0] : null;
}

function identityOf(device) {
  let mfr = ''; let pid = '';
  try { mfr = (device.getSetting && device.getSetting('zb_manufacturer_name')) || ''; } catch (_e) { /* */ }
  try { pid = (device.getSetting && (device.getSetting('zb_model_id') || device.getSetting('zb_product_id'))) || ''; } catch (_e) { /* */ }
  try {
    const st = (device.getStore && device.getStore()) || {};
    mfr = mfr || st.manufacturerName || st.zb_manufacturer_name || '';
    pid = pid || st.productId || st.modelId || st.zb_product_id || '';
  } catch (_e) { /* */ }
  return { mfr, pid };
}

const WRAPPED = new Map();
function wrap(Base, profile, hostClass) {
  const key = profile.id;
  if (WRAPPED.has(key)) {return WRAPPED.get(key);}
  const { migrateDeviceClass } = require('../utils/DeviceClassMigration');
  class Hosted extends Base {
    async onInit(...a) {
      this._hostedProfile = profile.id;
      if (profile.class && profile.class !== hostClass) {
        migrateDeviceClass(this, profile.class, ['other', hostClass]).catch(() => {});
      }
      return super.onInit(...a);
    }
  }
  Object.defineProperty(Hosted, 'name', { value: `Hosted_${profile.id}` });
  if (WRAPPED.size >= 128) {WRAPPED.clear();} // bounded: one entry per hosted profile (~23)
  WRAPPED.set(key, Hosted);
  return Hosted;
}

function mapDeviceClass(hostId, device, fallback, hostClass = 'other', t = table()) {
  try {
    const { mfr, pid } = identityOf(device);
    const pr = resolve(hostId, mfr, pid, t);
    if (pr) {
      const path = require('path');
      // eslint-disable-next-line global-require
      const Base = require(path.join(__dirname, '..', '..', pr.module));
      return wrap(Base, pr, hostClass);
    }
  } catch (_e) { /* fall back to the host device class */ }
  return fallback;
}

/** Publish-time fold. Returns { folded, skipped, keepDirs, pins }. */
function foldHosted(manifest, t, heldIds = new Set()) {
  const out = { folded: [], skipped: [], keepDirs: [], pins: [] };
  if (!manifest || !Array.isArray(manifest.drivers) || !t || !t.hosts) {return out;}
  for (const [hostId, profiles] of Object.entries(t.hosts)) {
    const host = manifest.drivers.find((d) => d && d.id === hostId);
    if (!host || !host.zigbee) { for (const p of profiles) {out.skipped.push(`${p.id}: host ${hostId} absent`);} continue; }
    for (const pr of profiles) {
      if (!heldIds.has(pr.id)) { out.skipped.push(`${pr.id}: not held (ships as its own driver)`); continue; }
      const held = manifest.drivers.find((d) => d && d.id === pr.id);
      const mfrs = arr(held && held.zigbee ? held.zigbee.manufacturerName : pr.manufacturerName);
      const pids = arr(held && held.zigbee ? held.zigbee.productId : pr.productId);
      const own = new Set(); for (const m of mfrs) {for (const p of pids) {own.add(`${lc(m)}|${lc(p)}`);}}
      const hm = [...new Set([...arr(host.zigbee.manufacturerName), ...mfrs])];
      const hp = [...new Set([...arr(host.zigbee.productId), ...pids])];
      const others = new Map();
      for (const d of manifest.drivers) {
        if (!d || d === host || d === held || !d.zigbee) {continue;}
        const dp = new Set(arr(d.zigbee.productId).map(lc));
        for (const m of arr(d.zigbee.manufacturerName)) {for (const p of dp) {others.set(`${lc(m)}|${p}`, d.id);}}
      }
      const collisions = [];
      for (const m of hm) {for (const p of hp) { const c = `${lc(m)}|${lc(p)}`; if (others.has(c)) {collisions.push(`${c}@${others.get(c)}`);} }}
      if (collisions.length) { out.skipped.push(`${pr.id}: collision ${collisions.slice(0, 3).join(', ')}`); continue; }
      host.zigbee.manufacturerName = hm;
      host.zigbee.productId = hp;
      if (held) {manifest.drivers = manifest.drivers.filter((d) => d !== held);}
      const seen = new Map();
      const canonPids = [...new Map(pids.map((x) => [lc(x), x])).values()].map((x) => pids.find((y) => lc(y) === lc(x)));
      for (const m of mfrs) {for (const p of canonPids) {
        const k = `${lc(m)}|${lc(p)}`; const n = seen.get(k) || 0;
        if (n < 2) { seen.set(k, n + 1); out.pins.push({ mfr: m, pid: p, driverId: hostId, note: `P3264 hosted ${pr.id}` }); }
      }}
      out.folded.push(`${pr.id}->${hostId}`);
      out.keepDirs.push(pr.id);
    }
  }
  return out;
}

// P3264: a sacred pin aimed at a hosted (held) profile now lives in its host slot.
function retargetSacred(sacred, folded) {
  const to = new Map((folded || []).map((f) => f.split('->')));
  return (sacred || []).map((c) => to.has(c.driverId) ? { ...c, driverId: to.get(c.driverId) } : c);
}

module.exports = {
  retargetSacred, resolve, mapDeviceClass, foldHosted, identityOf, table, _wrap: wrap };
