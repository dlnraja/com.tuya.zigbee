'use strict';
/**
 * P2348 — Salvagr #533 diag 724d4bc9 on 9.0.741: compact dropped 5slehgeo (case-sensitive)
 */
const assert = require('assert');
const { describe, it } = require('node:test');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

describe('P2348 Salvagr curtain compact sacred exact-case', () => {
  it('sacred-keep pins exact _TZE204_5slehgeo+TS0601 on curtain_motor', () => {
    const sk = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8'));
    assert.ok(sk.couples.some((c) => c.mfr === '_TZE204_5slehgeo' && c.pid === 'TS0601' && c.driverId === 'curtain_motor'));
  });

  it('compact keeps exact device-case manufacturerName (Homey pairing is case-sensitive)', () => {
    const tmp = path.join(ROOT, 'reports/inbox-l99-2026-08-31/_p2348-compact-app.json');
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'app.json'), tmp);
    const app = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    const compose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8'));
    const d = app.drivers.find((x) => x.id === 'curtain_motor');
    d.zigbee.manufacturerName = compose.zigbee.manufacturerName;
    d.zigbee.productId = compose.zigbee.productId;
    d.zigbee.endpoints = compose.zigbee.endpoints;
    // Simulate budget pressure: ensure 5slehgeo present then compact
    if (!d.zigbee.manufacturerName.includes('_TZE204_5slehgeo')) {
      d.zigbee.manufacturerName.unshift('_TZE204_5slehgeo');
    }
    fs.writeFileSync(tmp, JSON.stringify(app));
    const r = spawnSync(process.execPath, [
      path.join(ROOT, 'scripts/maintenance/compact-zigbee-identifiers.cjs'),
      tmp,
    ], { encoding: 'utf8', cwd: ROOT });
    assert.strictEqual(r.status, 0, r.stderr || r.stdout);
    const out = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    const mfrs = out.drivers.find((x) => x.id === 'curtain_motor').zigbee.manufacturerName;
    assert.ok(mfrs.includes('_TZE204_5slehgeo'), `exact case missing; have=${mfrs.filter((m) => /5slehgeo/i.test(m))}`);
    assert.ok(out.drivers.find((x) => x.id === 'curtain_motor').zigbee.productId.some((p) => /^TS0601$/i.test(p)));
  });

  it('curtain_motor compose clusters remain EF00 interview set', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8'));
    assert.deepEqual(c.zigbee.endpoints['1'].clusters.map(Number).sort((a, b) => a - b), [0, 4, 5, 61184]);
  });
});
