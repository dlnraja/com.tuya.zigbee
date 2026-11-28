'use strict';
// P3413b (2026-11-28): stable-v5 CI broke twice after P3404/P3413.
// 1) ci-self-check.yml was re-saved with a wrong codepage ("—" became "â€”"), so the
//    generated about header went stale. Guard: no workflow file carries UTF-8 mojibake.
// 2) P3404 added _TZ3290_8xzb2ghn (Zemismart ZXMIR-02 IR blaster, Z2M tuya.ts) to ir_blaster;
//    the old button_wireless_2 overlap on TS0002/TS0601 must stay a reviewed, baselined dual
//    (same decision as master 306f0665c1), never a NEW collision.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const WF = path.join(ROOT, '.github', 'workflows');
const MOJIBAKE = /\u00e2\u20ac|\u00e2\u2020|\u00c3[\u0080-\u00bf]/;

test('no workflow file contains UTF-8 mojibake', () => {
  const bad = fs.readdirSync(WF).filter((f) => /\.ya?ml$/.test(f))
    .filter((f) => MOJIBAKE.test(fs.readFileSync(path.join(WF, f), 'utf8')));
  assert.deepStrictEqual(bad, []);
});

test('_tz3290_8xzb2ghn IR blaster overlap is baselined and reviewed', () => {
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, '.github', 'fingerprint-collision-baseline.json'), 'utf8'));
  const keys = new Set(base.collisions.map((c) => c.key));
  for (const k of ['_tz3290_8xzb2ghn|TS0002', '_tz3290_8xzb2ghn|TS0601']) { assert.ok(keys.has(k), k); }
  const duals = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'native-matrix-reviewed-duals.json'), 'utf8'));
  const arr = duals[Object.keys(duals).find((k) => Array.isArray(duals[k]))];
  assert.ok(arr.some((e) => e.couple === '_TZ3290_8xzb2ghn|TS1201'));
  const ir = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'ir_blaster', 'driver.compose.json'), 'utf8'));
  assert.ok(ir.zigbee.manufacturerName.includes('_TZ3290_8xzb2ghn'), 'IR blaster keeps its real mfr');
});
