#!/usr/bin/env node
'use strict';
// P3264 fit-347: find, for each never-published held driver, a published host driver of the same
// class that can carry its exact couples with ZERO cross-product collision (Homey matches
// manufacturerName x productId per driver). Read-only; prints JSON. --write updates
// config/architecture/hosted-profiles.json candidates (review before applying).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const lc = (s) => String(s).trim().toLowerCase();
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);

function loadDrivers() {
  const out = new Map();
  for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const f = path.join(ROOT, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    const c = JSON.parse(fs.readFileSync(f, 'utf8'));
    const z = c.zigbee || {};
    out.set(id, { id, cls: c.class, mfr: arr(z.manufacturerName), pid: arr(z.productId) });
  }
  return out;
}

function couplesOf(d) {
  const s = new Set();
  for (const m of d.mfr) for (const p of d.pid) s.add(`${lc(m)}|${lc(p)}`);
  return s;
}

function find({ drivers, published, heldIds }) {
  const owner = new Map(); // lc couple -> Set(published ids)
  for (const id of published) {
    const d = drivers.get(id); if (!d) continue;
    for (const c of couplesOf(d)) { if (!owner.has(c)) owner.set(c, new Set()); owner.get(c).add(id); }
  }
  const res = [];
  for (const hid of heldIds) {
    const h = drivers.get(hid); if (!h) continue;
    const hp = new Set(h.pid.map(lc));
    const own = [...couplesOf(h)].filter((c) => owner.has(c));
    const cands = [];
    for (const id of published) {
      const d = drivers.get(id);
      if (!d || d.cls !== h.cls || !d.mfr.length) continue;
      const dp = new Set(d.pid.map(lc));
      if (![...hp].every((p) => dp.has(p))) continue;
      const extra = [...dp].filter((p) => !hp.has(p));
      const parasites = []; const collisions = [];
      for (const m of new Set(h.mfr.map(lc))) for (const p of extra) {
        const c = `${m}|${p}`; parasites.push(c);
        const o = owner.get(c); if (o && [...o].some((x) => x !== id)) collisions.push(c);
      }
      if (collisions.length) continue;
      cands.push({ host: id, parasites: parasites.length, hostPids: dp.size });
    }
    cands.sort((a, b) => a.parasites - b.parasites || a.hostPids - b.hostPids || a.host.localeCompare(b.host));
    res.push({ held: hid, cls: h.cls, couplesAlreadyPublishedElsewhere: own, best: cands[0] || null, alternatives: cands.slice(1, 4) });
  }
  return res;
}

module.exports = { find, loadDrivers, couplesOf };

if (require.main === module) {
  const drivers = loadDrivers();
  const published = require(path.join(ROOT, 'test/fixtures/athom-test-9.0.1574-driver-ids.json'));
  const pub = Array.isArray(published) ? published : published.ids;
  const heldIds = require(path.join(ROOT, 'config/publish-hold-drivers.json')).drivers.map((d) => d.id);
  console.log(JSON.stringify(find({ drivers, published: pub, heldIds }), null, 1));
}
