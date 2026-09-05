'use strict';

/**
 * P197 — enrichers must not re-place forbidden mfrs; soak-first skips
 * 5.12 drafts while 9.x occupies the shared Test slot; live docs must
 * not claim a separate com.dlnraja.tuya.zigbee.stable App ID.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P197 enrich soak identity', () => {
  it('anti-bot loop strips then detects', () => {
    const src = read('tools/ci/auto-enrich-closed-loop.js');
    assert(src.includes('--strip'), 'closed loop must strip forbidden placements before detect');
    assert(src.includes('anti-bot-regression-gate.js'), 'closed loop must run anti-bot gate');
  });

  it('blakadder and forum appliers refuse forbidden placements', () => {
    for (const rel of [
      'tools/ci/apply-blakadder-new.js',
      'tools/ci/apply-blakadder-new-fps-r68.js',
      'tools/ci/apply-forum-silent-multi.js',
    ]) {
      const src = read(rel);
      assert(src.includes('isForbiddenPlacement'), `${rel} must consult UserMisattributionRegistry`);
    }
  });

  it('publish-stable skips draft while soak skip=true', () => {
    const yml = read('.github/workflows/publish-stable.yml');
    assert(yml.includes('needs.soak.outputs.skip != \'true\''), 'publish job must depend on soak skip');
    assert(/name:\s*"Publish to Draft"[\s\S]*if:\s*needs\.soak\.outputs\.skip/.test(yml), 'draft job gated by soak');
  });

  it('wifi_camera marks destroyed and uses safe timers', () => {
    const src = read('drivers/wifi_camera/device.js');
    assert(src.includes('this._destroyed = true'), 'onDeleted must set _destroyed');
    assert(src.includes('safeSetTimeout'), 'must use safe-timers');
    assert(src.includes('safeClearInterval'), 'must clear Homey intervals via safe-timers');
    assert(!/\bclearInterval\(/.test(src.replace(/safeClearInterval/g, '')), 'must not raw-clearInterval Homey timers');
  });

  it('live mandate documents dual app tracks accurately', () => {
    const mandate = read('AI_CONTEXT_MANDATE.md');
    assert(mandate.includes('com.dlnraja.tuya.zigbee'), 'mandate must include master App ID');
    assert(mandate.includes('com.dlnraja.tuya.zigbee.stable'), 'mandate must include stable App ID');
  });
});
