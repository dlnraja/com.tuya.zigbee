'use strict';

/**
 * P2236 — forum processor must never route TS004x remotes to switch_*gang
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

describe('P2236 forum TS004x routing guard', () => {
  it('KNOWN_ROUTES locks 4upl1fcj+TS0041 → button_wireless_1', () => {
    const { KNOWN_ROUTES } = require('../../tools/ci/apply-forum-silent-multi');
    const hit = KNOWN_ROUTES.find((r) => r.id === 'p2236-4upl1fcj-button1');
    assert.ok(hit);
    assert.strictEqual(hit.driver, 'button_wireless_1');
    assert.ok(hit.pids.includes('TS0041'));
  });

  it('DeviceFingerprintDB has 4upl1fcj|TS0041 → button_wireless_1', () => {
    const { FINGERPRINT_DB } = require('../../lib/DeviceFingerprintDB');
    const e = FINGERPRINT_DB['_TZ3000_4upl1fcj|TS0041'];
    assert.ok(e);
    assert.strictEqual(e.driver, 'button_wireless_1');
  });

  it('compose: 4upl1fcj not on switch_1gang; on button_wireless_1', () => {
    const fs = require('fs');
    const path = require('path');
    const s1 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', 'switch_1gang', 'driver.compose.json'), 'utf8'));
    const bw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', 'button_wireless_1', 'driver.compose.json'), 'utf8'));
    const has = (j, mfr) => (j.zigbee.manufacturerName || []).some((m) => String(m).toLowerCase() === mfr.toLowerCase());
    assert.strictEqual(has(s1, '_TZ3000_4upl1fcj'), false);
    assert.strictEqual(has(bw, '_TZ3000_4upl1fcj'), true);
  });

  it('compose: qeuvnohg on din_rail_switch not smartPlug_DinRail', () => {
    const fs = require('fs');
    const path = require('path');
    const din = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', 'din_rail_switch', 'driver.compose.json'), 'utf8'));
    const plug = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', 'smartPlug_DinRail', 'driver.compose.json'), 'utf8'));
    const has = (j, mfr) => (j.zigbee.manufacturerName || []).some((m) => String(m).toLowerCase() === mfr.toLowerCase());
    assert.strictEqual(has(din, '_TZ3000_qeuvnohg'), true);
    assert.strictEqual(has(plug, '_TZ3000_qeuvnohg'), false);
  });

  it('forum processor: 4upl1fcj+TS0041 never routes to switch_1gang', () => {
    const { analyzeCouple, buildDriverIndex } = require('../../tools/ci/forum-actionable-processor');
    const index = buildDriverIndex();
    const r = analyzeCouple('_TZ3000_4upl1fcj', 'TS0041', index, new Map());
    assert.notStrictEqual(r.canonicalDriver, 'switch_1gang');
    assert.ok(['ROUTED_OK', 'SINGLE_DRIVER', 'LOCKED_OK'].includes(r.verdict));
    assert.strictEqual(r.canonicalDriver, 'button_wireless_1');
  });

  it('KNOWN_ROUTES includes amdymr7l and nkcobies P2236 couples', () => {
    const { KNOWN_ROUTES } = require('../../tools/ci/apply-forum-silent-multi');
    assert.ok(KNOWN_ROUTES.some((r) => r.id === 'p2236-amdymr7l-plug-energy'));
    assert.ok(KNOWN_ROUTES.some((r) => r.id === 'p2236-nkcobies-smartplug'));
  });
});
