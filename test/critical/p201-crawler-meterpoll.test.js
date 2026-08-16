'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P201 crawler wiring + meterPoll', () => {
  it('gmail-diagnostics wrapper exists and points at fetch-gmail-diagnostics', () => {
    const wrap = read('tools/ci/gmail-diagnostics.js');
    assert(wrap.includes('fetch-gmail-diagnostics.js'), 'wrapper must require canonical fetcher');
    assert(fs.existsSync(path.join(ROOT, '.github', 'scripts', 'fetch-gmail-diagnostics.js')));
  });

  it('mega-crawler forum slot uses live forum-fetch-140352', () => {
    const src = read('tools/ci/mega-crawler.js');
    assert(src.includes("id: 'forum'"), 'forum crawler present');
    assert(src.includes('forum-fetch-140352.js'), 'forum cmd must be live Discourse fetch');
    assert(!/id: 'forum'[\s\S]{0,200}forum-integration\.js/.test(src), 'forum slot must not be static interviews');
  });

  it('auto-enrich crawl uses gmail wrapper + silent forum scan', () => {
    const src = read('tools/ci/auto-enrich-closed-loop.js');
    assert(src.includes('tools/ci/gmail-diagnostics.js'), 'gmail via wrapper');
    assert(src.includes('forum-silent-multi-scan.js'), 'forum via silent multi-scan');
  });

  it('energy plugs clear _meterPoll and pass 120s interval', () => {
    for (const rel of [
      'drivers/device_air_purifier_plug/device.js',
      'drivers/dimmer_wall_plug/device.js',
    ]) {
      const src = read(rel);
      assert(src.includes('safeSetInterval'), `${rel} must create via safeSetInterval`);
      assert(src.includes('120000'), `${rel} must poll every 120s`);
      assert(src.includes('safeClearInterval(this, this._meterPoll)'), `${rel} must clear _meterPoll`);
      assert(src.includes('async onUninit'), `${rel} must implement onUninit`);
    }
  });

  it('wifi_camera implements onUninit cleanup', () => {
    const src = read('drivers/wifi_camera/device.js');
    assert(src.includes('async onUninit'), 'must have onUninit');
    assert(/async onUninit\(\)[\s\S]*_stopTimers/.test(src), 'onUninit must stop timers');
  });

  it('live identity docs do not claim separate .stable App ID', () => {
    for (const rel of [
      'docs/meta/AI_OFFLINE_GUIDE.md',
      'PROJECT_INDEX.md',
    ]) {
      const src = read(rel);
      assert(
        !src.includes('| `com.dlnraja.tuya.zigbee.stable` |') &&
          !src.includes('App ID: com.dlnraja.tuya.zigbee.stable') &&
          !/\*\*App ID\*\*:\s*`com\.dlnraja\.tuya\.zigbee\.stable`/.test(src),
        `${rel} must not claim live .stable App ID`
      );
    }
  });
});
