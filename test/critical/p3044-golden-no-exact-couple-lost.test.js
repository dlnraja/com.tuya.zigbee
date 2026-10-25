'use strict';
// P3044: the spec010 golden snapshot was refreshed on stable-v5 / bastien-home after checking
// that every "lost" line is an intended, owner-approved change and that no exact mfr+pid couple
// left the branch. This guard pins the facts that made the refresh safe:
//  - drivers with an empty manufacturer list no longer carry the bare TS0601 wildcard (P3038, #576)
//    and that drop removed no mfr+pid couple (an empty list cannot pair an exact couple);
//  - moved couples still have exactly one owner (caseless): _TZE204_byzdayie|TS0601 on
//    energy_meter_din when power_meter no longer lists it, _TZE200_yh7aoahi|TS0205 on smoke_sensor
//    when smoke_sensor3 no longer lists it;
//  - the golden snapshot matches the current compose files (no hidden shrink).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const DRV = path.join(ROOT, 'drivers');
const low = (v) => String(v).trim().toLowerCase();
const list = (v) => (Array.isArray(v) ? v : (v ? [v] : [])).filter((x) => typeof x === 'string');
function compose(d) {
  const f = path.join(DRV, d, 'driver.compose.json');
  if (!fs.existsSync(f)) return null;
  const z = JSON.parse(fs.readFileSync(f, 'utf8')).zigbee || {};
  return { mfrs: list(z.manufacturerName).map(low), pids: list(z.productId).map(low) };
}
function owners(mfr, pid) {
  const out = [];
  for (const d of fs.readdirSync(DRV)) {
    const c = compose(d);
    if (c && c.mfrs.includes(low(mfr)) && c.pids.includes(low(pid))) out.push(d);
  }
  return out;
}

describe('P3044 golden refresh: no exact mfr+pid couple lost', () => {
  const WILDCARD_DROPS = ['device_plug_smart', 'dimmer_dual_channel', 'double_power_point',
    'remote_button_wireless_smart', 'sensor_lcdtemphumidsensor_temphumidsensor',
    'device_plug_energy_monitor', 'dimmer_1_gang_2', 'outdoor_2_socket'];

  it('wildcard-drop drivers: empty manufacturer list and no bare TS0601', () => {
    for (const d of WILDCARD_DROPS) {
      const c = compose(d);
      if (!c) continue;
      if (c.mfrs.length) continue; // driver has real couples on this branch: P3038 did not touch it
      assert.ok(!c.pids.includes('ts0601'), `${d} must not carry the TS0601 wildcard (#576)`);
    }
  });

  it('_TZE204_byzdayie|TS0601 (Z2M DDS238-1-Z1) keeps an owner, energy_meter_din', () => {
    const o = owners('_TZE204_byzdayie', 'TS0601');
    assert.ok(o.includes('energy_meter_din'), `owners: ${o.join(',')}`);
    const pm = compose('power_meter');
    if (pm && !pm.mfrs.includes('_tze204_byzdayie')) assert.deepStrictEqual(o, ['energy_meter_din']);
  });

  it('_TZE200_yh7aoahi|TS0205 keeps exactly one owner', () => {
    const o = owners('_TZE200_yh7aoahi', 'TS0205');
    assert.strictEqual(o.length, 1, `owners: ${o.join(',')}`);
  });

  it('golden snapshot matches compose (counts and hashes)', () => {
    const g = JSON.parse(fs.readFileSync(path.join(ROOT, 'specs/010-modular-lazy-data/golden-couples.json'), 'utf8')).snapshot;
    const norm = (l) => [...new Set(l.map((v) => v.trim().toLowerCase()).filter(Boolean))].sort();
    const sha = (a) => crypto.createHash('sha256').update(a.join('\n')).digest('hex').slice(0, 16);
    for (const d of [...WILDCARD_DROPS, 'power_meter', 'energy_meter_din', 'smoke_sensor', 'smoke_sensor3']) {
      if (!g[d]) continue;
      const z = JSON.parse(fs.readFileSync(path.join(DRV, d, 'driver.compose.json'), 'utf8')).zigbee || {};
      const m = norm(list(z.manufacturerName)); const p = norm(list(z.productId));
      assert.strictEqual(g[d].mfr, m.length, `${d} mfr count`);
      assert.strictEqual(g[d].pid, p.length, `${d} pid count`);
      assert.strictEqual(g[d].mfrSha, sha(m), `${d} mfr sha`);
      assert.strictEqual(g[d].pidSha, sha(p), `${d} pid sha`);
    }
  });
});
