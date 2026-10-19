'use strict';

// P2890 — _TZ3000_nrfkrgf4 / TS0046 is a 6-button battery scene remote (Z2M TS0046 generic
// definition; deCONZ ships a dedicated Tuya6gangMap for this maker: endpoints 1..6, OnOff 0xFD,
// payload 0/1/2 = short/double/long). It used to sit in the relay driver switch_1gang and never matched.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const compose = (id) => readJson(`drivers/${id}/driver.compose.json`).zigbee;
const has = (l, v) => (l || []).some((x) => String(x).trim().toLowerCase() === v.toLowerCase());
const MFR = '_TZ3000_nrfkrgf4';

describe('P2890 TS0046 6-gang scene switch _TZ3000_nrfkrgf4', () => {
  it('exactly one driver lists the maker (any case): button_wireless_6', () => {
    const owners = fs.readdirSync(path.join(ROOT, 'drivers'))
      .filter((id) => fs.existsSync(path.join(ROOT, 'drivers', id, 'driver.compose.json')))
      .filter((id) => { try { return has(compose(id).manufacturerName, MFR); } catch (_e) { return false; } });
    assert.deepStrictEqual(owners, ['button_wireless_6']);
  });

  it('button_wireless_6 claims the exact couple with all case forms and 6 endpoints with OnOff', () => {
    const z = compose('button_wireless_6');
    assert.ok(has(z.productId, 'TS0046'));
    for (const f of ['_TZ3000_nrfkrgf4', '_tz3000_nrfkrgf4', '_TZ3000_NRFKRGF4']) assert.ok(z.manufacturerName.includes(f), f);
    for (const ep of ['1', '2', '3', '4', '5', '6']) assert.ok(z.endpoints[ep].clusters.includes(6), 'ep ' + ep);
  });

  it('per-button single/double/long flow triggers exist', () => {
    const fl = JSON.stringify(readJson('drivers/button_wireless_6/driver.flow.compose.json'));
    for (const k of ['pressed', 'double', 'long']) assert.ok(fl.includes(k), k);
  });

  it('device uses the hybrid RX (0xFD per endpoint) with 6 buttons', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_6/device.js'), 'utf8');
    assert.ok(/buttonCount\s*=\s*6/.test(src));
  });

  it('fingerprint SSOT points at button_wireless_6', () => {
    const f = readJson('lib/tuya/fingerprints.json');
    const t = f.fingerprints || f;
    const k = Object.keys(t).filter((x) => x.toLowerCase() === MFR.toLowerCase());
    assert.ok(k.length > 0);
    for (const x of k) assert.strictEqual(t[x].driverId, 'button_wireless_6');
  });

  it('automation cannot undo it (pin, removal, registry when present)', () => {
    const pf = path.join(ROOT, 'config/architecture/couple-driver-pins.json');
    if (fs.existsSync(pf)) assert.ok(readJson('config/architecture/couple-driver-pins.json').pins.some((p) => p.driver === 'button_wireless_6' && p.pid === 'TS0046' && has(p.mfr, MFR)));
    const rf = path.join(ROOT, 'config/architecture/curated-couple-removals.json');
    if (fs.existsSync(rf)) assert.ok(readJson('config/architecture/curated-couple-removals.json').removals.some((r) => r.driver === 'switch_1gang' && has(r.mfr, MFR)));
  });
});
