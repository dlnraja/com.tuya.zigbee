'use strict';
/**
 * P3395 — enrichment must honour config/architecture/curated-couple-removals.json itself
 * (run 45066450460: fleet-enrich re-added _TZE284_rlytpmij to curtain_motor, P2698).
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const S = require('../../tools/ci/strip-curated-couple-removals.js');

test('repo rules deny _TZE284_rlytpmij on curtain_motor (case-insensitive)', () => {
  const deny = S.denyMap(JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/curated-couple-removals.json'), 'utf8')));
  assert.ok(deny.get('curtain_motor').has('_tze284_rlytpmij'));
});

test('filterCompose drops rlytpmij from curtain_motor in any case, keeps the rest', () => {
  const deny = S.denyMap({ removals: [{ driver: 'curtain_motor', mfr: ['_TZE284_rlytpmij'] }] });
  const c = { zigbee: { manufacturerName: ['_TZE200_keep', '_tze284_RLYTPMIJ', '_TZE284_rlytpmij'], productId: ['TS0601'] } };
  const { compose, removed } = S.filterCompose(c, deny.get('curtain_motor'));
  assert.deepStrictEqual(compose.zigbee.manufacturerName, ['_TZE200_keep']);
  assert.deepStrictEqual(compose.zigbee.productId, ['TS0601']);
  assert.strictEqual(removed.length, 2);
});

test('run --apply strips the re-bleed on curtain_motor only; wall_thermostat owner untouched', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p3395-'));
  try {
    fs.mkdirSync(path.join(tmp, 'config/architecture'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'config/architecture/curated-couple-removals.json'), path.join(tmp, 'config/architecture/curated-couple-removals.json'));
    const write = (d, mfrs) => {
      fs.mkdirSync(path.join(tmp, 'drivers', d), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'drivers', d, 'driver.compose.json'), `${JSON.stringify({ id: d, zigbee: { manufacturerName: mfrs, productId: ['TS0601'] } }, null, 2)}\n`);
    };
    write('curtain_motor', ['_TZE200_zah67ekd', '_TZE284_rlytpmij']);
    write('wall_thermostat', ['_TZE284_rlytpmij']);
    const dry = S.run({ root: tmp, apply: false });
    assert.deepStrictEqual(dry.hits.map((h) => h.driver), ['curtain_motor']);
    S.run({ root: tmp, apply: true });
    const read = (d) => JSON.parse(fs.readFileSync(path.join(tmp, 'drivers', d, 'driver.compose.json'), 'utf8')).zigbee.manufacturerName;
    assert.deepStrictEqual(read('curtain_motor'), ['_TZE200_zah67ekd']);
    assert.deepStrictEqual(read('wall_thermostat'), ['_TZE284_rlytpmij']);
    assert.strictEqual(S.run({ root: tmp, apply: false }).hits.length, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('repo tree: no curated removal present in its denied driver; enrich + workflow wire the strip', () => {
  assert.strictEqual(S.run({ root: ROOT, apply: false }).hits.length, 0);
  assert.match(fs.readFileSync(path.join(ROOT, 'tools/ci/fleet-intelligent-enrich.js'), 'utf8'), /strip-curated-couple-removals\.js/);
  assert.match(fs.readFileSync(path.join(ROOT, 'tools/ci/driver-class-fleet-enrich.js'), 'utf8'), /strip-curated-couple-removals\.js/);
  const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/fleet-intelligent-enrich.yml'), 'utf8');
  assert.ok(wf.indexOf('strip-curated-couple-removals.js --apply') > 0);
  assert.ok(wf.indexOf('strip-curated-couple-removals.js --apply') < wf.indexOf('name: Sacred + anti-bot gates'));
});
