'use strict';
const { describe, it } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha
// P3038c (dlnraja t516u 25/10, "compense la perte de couverture"): P3038 removed TS0601 from
// empty-manufacturer drivers, so real TS0601 devices that only paired through that wildcard got no
// driver. Each sourced couple is added to the existing driver of its real device class and pinned
// sacred. Unsourced or unfittable couples stay in data/leads/p3038c-ts0601-unmapped-2026-10-25.json.
// Ledger: config/architecture/p3038c-ts0601-compensation.json (one source URL per couple).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const rj = (...p) => JSON.parse(fs.readFileSync(path.join(ROOT, ...p), 'utf8'));
const { compactZigbeeIdentifiers } = require(path.join(ROOT, 'scripts', 'maintenance', 'compact-zigbee-identifiers.cjs'));
const LEDGER = rj('config', 'architecture', 'p3038c-ts0601-compensation.json').added;
const LEADS = rj('data', 'leads', 'p3038c-ts0601-unmapped-2026-10-25.json');
const sacred = rj('config', 'architecture', 'publish-sacred-keep-couples.json').couples;
const SOURCES = /^https:\/\/github\.com\/(Koenkk\/zigbee-herdsman-converters|zigpy\/zha-device-handlers|dresden-elektronik\/deconz-rest-plugin|JohanBendz\/com\.tuya\.zigbee)\/blob\/[0-9a-f]{40}\//;
// Exact claims only: remaining empty-manufacturer drivers (out of P3038c scope, owner point 3) are
// wildcards in source install and are never shipped in the publish payload.
const claims = (drivers, mfr, pid) => drivers.filter((d) => d.zigbee && !d.deprecated && (d.zigbee.productId || []).includes(pid)
  && (d.zigbee.manufacturerName || []).includes(mfr)).map((d) => d.id);
const wildcards = (drivers, pid) => drivers.filter((d) => d.zigbee && (d.zigbee.productId || []).includes(pid)
  && (d.zigbee.manufacturerName || []).length === 0).map((d) => d.id);
const source = () => fs.readdirSync(path.join(ROOT, 'drivers')).filter((d) => fs.existsSync(path.join(ROOT, 'drivers', d, 'driver.compose.json')))
  .map((d) => Object.assign(rj('drivers', d, 'driver.compose.json'), { id: d })); // folder name is the driver id
describe('P3038c TS0601 coverage compensation', function () {
  if (this && this.timeout) this.timeout(120000);
  it('ledger is non-empty, sourced, TS0601 only, no duplicates', () => {
    assert.ok(LEDGER.length > 0);
    assert.strictEqual(new Set(LEDGER.map((a) => a.mfr)).size, LEDGER.length);
    for (const a of LEDGER) {
      assert.strictEqual(a.pid, 'TS0601', a.mfr);
      assert.match(a.url, SOURCES, `${a.mfr} needs one pinned reliable source`);
      assert.ok(!/xxxxxxxx/.test(a.mfr), 'Johan dummy placeholder is not a real device');
    }
  });
  it('each couple pairs on exactly its driver in source install and is pinned once', () => {
    const drv = source();
    for (const a of LEDGER) {
      assert.deepStrictEqual(claims(drv, a.mfr, 'TS0601'), [a.driverId], a.mfr);
      const pins = sacred.filter((c) => c.mfr === a.mfr && c.pid === 'TS0601');
      assert.strictEqual(pins.length, 1, a.mfr);
      assert.strictEqual(pins[0].driverId, a.driverId, a.mfr);
    }
  });
  it('rebuilt publish payload keeps every couple on its driver only, ceiling held', () => {
    const m = rj('app.json');
    const cwd = process.cwd();
    process.chdir(ROOT);
    let r;
    try { r = compactZigbeeIdentifiers(m, (()=>{const y=fs.readFileSync(path.join(ROOT,'.github','workflows','auto-publish-on-push.yml'),'utf8');return {maxTotalCombos:Number(y.match(/HOMEY_ZIGBEE_MAX_TOTAL_COMBOS:\s*"(\d+)"/)[1]),maxDriverCombos:1500,maxCaseForms:2};})()); } finally { process.chdir(cwd); }
    assert.strictEqual(r.overTotalLimit, false);
    assert.deepStrictEqual(r.sacredMissing || [], []);
    assert.deepStrictEqual(wildcards(m.drivers, 'TS0601'), [], 'payload must carry no TS0601 wildcard');
    for (const a of LEDGER) assert.deepStrictEqual(claims(m.drivers, a.mfr, 'TS0601'), [a.driverId], a.mfr);
  });
  it('leads were not silently added to a driver', () => {
    const drv = source();
    for (const l of LEADS.leads) assert.deepStrictEqual(claims(drv, l.mfr, 'TS0601'), [], `${l.mfr} is a lead, not a mapping`);
  });
});
