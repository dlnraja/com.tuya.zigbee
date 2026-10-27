'use strict';
// P3086: 608e233c65 (market-couples P2232, [skip ci]) committed an app.json written by
// sync-appjson-zigbee.js: pretty-printed (5.35 MB) with 296 raw "{{driverAssetsPath}}" learnmode
// images, so the P3079 parity gate went red on master. The sync now resolves templates like the
// Homey composer and writes compact; the market workflow regenerates app.json from compose and runs
// compose_parity_or_die before safe-auto-commit, refusing the commit on drift.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { resolveTemplates, syncZigbee } = require('../../scripts/maintenance/sync-appjson-zigbee.js');
const { compact } = require('../../scripts/maintenance/regen-appjson-from-compose.cjs');

describe('P3086 market-couples app.json stays compose-parity clean', () => {
  it('resolveTemplates substitutes like HomeyCompose (driverAssetsPath, driverPath, driverId, driverName)', () => {
    const z = { learnmode: { image: '{{driverAssetsPath}}/learnmode.svg', instruction: { en: 'Pair {{driverName}} ({{driverId}})', fr: '{{driverNameFr}}' } },
      endpoints: { 1: { clusters: [0, 6] } }, extra: ['{{driverPath}}/x'] };
    const r = resolveTemplates(z, 'plug_x', { en: 'Plug', fr: 'Prise' });
    assert.strictEqual(r.learnmode.image, '/drivers/plug_x/assets/learnmode.svg');
    assert.strictEqual(r.learnmode.instruction.en, 'Pair Plug (plug_x)');
    assert.strictEqual(r.learnmode.instruction.fr, 'Prise');
    assert.deepStrictEqual(r.extra, ['/drivers/plug_x/x']);
    assert.deepStrictEqual(r.endpoints, { 1: { clusters: [0, 6] } });
    assert.strictEqual(z.learnmode.image, '{{driverAssetsPath}}/learnmode.svg', 'input not mutated');
  });

  it('syncZigbee writes a compact app.json with resolved images (the 608e233c65 shape cannot come back)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3086-t-'));
    try {
      fs.mkdirSync(path.join(dir, 'drivers', 'd1'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'drivers', 'd1', 'driver.compose.json'), JSON.stringify({
        name: { en: 'D1' }, zigbee: { manufacturerName: ['_TZ3000_new'], productId: ['TS011F'], learnmode: { image: '{{driverAssetsPath}}/learnmode.svg' } } }));
      const appPath = path.join(dir, 'app.json');
      fs.writeFileSync(appPath, JSON.stringify({ id: 'x', drivers: [{ id: 'd1', name: { en: 'D1' }, zigbee: { manufacturerName: ['_TZ3000_old'], productId: ['TS011F'], learnmode: { image: '/drivers/d1/assets/learnmode.svg' } } }] }));
      assert.deepStrictEqual(syncZigbee(appPath, path.join(dir, 'drivers')), { synced: 1, changed: 1, missing: 0 });
      const raw = fs.readFileSync(appPath, 'utf8');
      assert.ok(!raw.includes('{{'), 'no raw compose template left');
      assert.strictEqual(raw.split('\n').length, 2, 'compact: one line + trailing newline');
      assert.strictEqual(JSON.parse(raw).drivers[0].zigbee.learnmode.image, '/drivers/d1/assets/learnmode.svg');
      assert.deepStrictEqual(syncZigbee(appPath, path.join(dir, 'drivers')).changed, 0, 'idempotent');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it('tracked app.json is compact and carries no unresolved compose template', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8');
    assert.ok(!/{{driver(AssetsPath|Path|Id|Name[A-Za-z]*)}}/.test(raw), 'raw compose template in app.json');
    assert.strictEqual(raw.replace(/\n$/, ''), compact(JSON.parse(raw)).trimEnd(), 'app.json must be written compact (sanitize-manifest form)');
  });

  it('market-couples-intake regenerates from compose and runs compose_parity_or_die before safe-auto-commit', () => {
    const y = fs.readFileSync(path.join(ROOT, '.github/workflows/market-couples-intake.yml'), 'utf8');
    const step = y.slice(y.indexOf('Commit state + compose'));
    const iSync = step.indexOf('sync-appjson-zigbee.js');
    const iRegen = step.indexOf('node scripts/maintenance/regen-appjson-from-compose.cjs');
    const iGate = step.indexOf('node scripts/ci/compose-parity-gate.cjs --base=');
    const iCall = step.indexOf('\n          compose_parity_or_die\n');
    // master commits through safe-auto-commit; stable-v5 / bastien-home stage with git add then commit
    const iCommit = [step.indexOf('node scripts/ci/safe-auto-commit.js'), step.indexOf('\n          git add ')]
      .filter((i) => i >= 0).sort((a, b) => a - b)[0];
    assert.ok(iSync >= 0 && iSync < iRegen && iRegen < iGate && iGate < iCall && iCall < iCommit, 'order sync → regen → gate → commit');
    const gateBlock = step.slice(iGate, iCall);
    assert.ok(/exit 1/.test(gateBlock), 'drift must stop the job before the commit');
    assert.ok(!/regen-appjson-from-compose\.cjs[^\n]*\|\| true/.test(step), 'regen failure must not be swallowed');
    assert.ok(/git show HEAD:app\.json/.test(step.slice(iRegen, iGate)), 'no-loss base is HEAD app.json');
  });

  it('regen script chains compose rebuild → flow dedupe → sanitize-manifest and keeps the committed version', () => {
    const full = fs.readFileSync(path.join(ROOT, 'scripts/maintenance/regen-appjson-from-compose.cjs'), 'utf8');
    const src = full.slice(full.indexOf('async function regenerate'));
    const order = ['rebuildFromCompose(', 'sync-appjson-flow-dedupe.js', 'sanitize-manifest.cjs'].map((s) => src.indexOf(s));
    assert.ok(order.every((i) => i > 0) && order[0] < order[1] && order[1] < order[2], `order ${order}`);
    assert.ok(/composed\.version = committed\.version/.test(src));
  });
});
