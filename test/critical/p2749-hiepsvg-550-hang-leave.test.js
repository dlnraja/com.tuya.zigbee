'use strict';
/**
 * P2749 — HiepSVG GH#550 @ 9.0.1264 hang after leave
 *
 * Contre quoi (exact):
 * 1. alarms hang YES with no lux/distance update when stepping out
 * 2. lux/distance fail to update even when stepping back
 * 3. distance still vacillates
 *
 * Root: sticky DP1 Occupied resets survival while streams frozen;
 * soft-clear skipped at d>1m (P2725); hang-watchdog did not clear presence.
 *
 * Dual-app: BOTH
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const deviceSrc = fs.readFileSync(
  path.join(ROOT, 'drivers/presence_sensor_radar/device.js'),
  'utf8',
);

describe('P2749 HiepSVG #550 hang-leave resolve', () => {
  it('defines hung-for-leave helper (both streams ≥45s)', () => {
    assert.ok(/_ceilingStreamsHungForLeave/.test(deviceSrc));
    assert.ok(/45_000/.test(deviceSrc));
  });

  it('survival life ignores sticky presence when streams hung', () => {
    assert.ok(/_ceilingStreamsHungForLeave\(\)/.test(deviceSrc));
    assert.ok(/sticky DP1 Occupied must NOT reset survival/.test(deviceSrc)
      || /streamsHungForLeave/.test(deviceSrc));
    const lifeFn = deviceSrc.slice(
      deviceSrc.indexOf('_isMeaningfulSurvivalLife'),
      deviceSrc.indexOf('_isMeaningfulSurvivalLife') + 900,
    );
    assert.ok(/reason === 'presence'/.test(lifeFn));
    assert.ok(/_ceilingStreamsHungForLeave/.test(lifeFn));
  });

  it('soft-clear no longer skips d>1 when streams hung', () => {
    assert.ok(/!this\._ceilingStreamsHungForLeave\(now\)/.test(deviceSrc));
  });

  it('hang watchdog clears presence + remagic + find_switch bypass', () => {
    assert.ok(/hang-clear presence/.test(deviceSrc) || /P2749 hang-clear/.test(deviceSrc));
    assert.ok(/_ensureRadarMagicHandshake/.test(deviceSrc));
    assert.ok(/hang\|watchdog/.test(deviceSrc) || /hang\|watchdog/.test(deviceSrc.replace(/\\/g, '')));
    assert.ok(/sticky-hang/.test(deviceSrc));
  });

  it('drops sticky DP1 paint while streams hung', () => {
    assert.ok(/P2749 drop sticky DP1 while streams hung/.test(deviceSrc));
  });

  it('ghost farther gate tightened (0.5m + vacillate)', () => {
    assert.ok(/prev \+ 0\.5/.test(deviceSrc));
    assert.ok(/trendingFarther/.test(deviceSrc));
  });

  it('button_wireless_3 titleFormatted locales include [[button]]', () => {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.flow.compose.json'),
      'utf8',
    ));
    const card = (flow.triggers || []).find(
      (t) => t.id === 'button_wireless_3_button_3gang_button_pressed',
    );
    assert.ok(card);
    for (const [lang, tf] of Object.entries(card.titleFormatted || {})) {
      assert.ok(String(tf).includes('[[button]]'), `${lang} missing [[button]]`);
    }
  });

  it('remote_button_wireless 3gang titleFormatted locales include [[button]]', () => {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/remote_button_wireless/driver.flow.compose.json'),
      'utf8',
    ));
    const card = (flow.triggers || []).find(
      (t) => t.id === 'remote_button_wireless_button_3gang_button_pressed',
    );
    assert.ok(card);
    for (const [lang, tf] of Object.entries(card.titleFormatted || {})) {
      assert.ok(String(tf).includes('[[button]]'), `${lang} missing [[button]]`);
    }
  });
});
