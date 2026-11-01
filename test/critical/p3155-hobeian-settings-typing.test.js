'use strict';

/**
 * P3155 — ZG-204ZM completion (forum 26439 #5538, t756u).
 * Source: Koenkk/zigbee-herdsman-converters src/devices/hobeian.ts (2026-11-01).
 * Contre quoi: indicator/anti_interference settings TX'd as 4-byte VALUE (MCU ignores),
 * and ZG-204ZM static distance stuck at whole meters while Z2M exposes 0.01 m.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { SENSOR_CONFIGS } = require('../../drivers/presence_sensor_radar/configs');

describe('P3155 HOBEIAN radar settings typing', () => {
  it('every indicator / anti_interference setting DP is typed bool', () => {
    let n = 0;
    for (const [name, cfg] of Object.entries(SENSOR_CONFIGS)) {
      for (const [dp, m] of Object.entries(cfg.dpMap || {})) {
        if (m.setting === 'indicator' || m.setting === 'anti_interference') {
          if (!/^HOBEIAN_/.test(name)) {continue;}
          assert.strictEqual(m.type, 'bool', `${name} DP${dp} ${m.setting}`);
          n++;
        }
      }
    }
    assert.ok(n >= 9, `typed count ${n}`);
  });

  it('ZG-204ZM static distance keeps /100 and exposes 0.01 m step', () => {
    const dp4 = SENSOR_CONFIGS.HOBEIAN_ZG204ZM.dpMap[4];
    assert.strictEqual(dp4.divisor, 100);
    assert.strictEqual(dp4.max, 6);
    const compose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'), 'utf8'));
    const find = (arr) => {
      for (const s of arr || []) {
        if (s.children) { const r = find(s.children); if (r) {return r;} }
        if (s.id === 'static_detection_distance') {return s;}
      }
      return null;
    };
    assert.strictEqual(find(compose.settings).step, 0.01);
  });

  it('ZG-204ZX DP108 indicator is additive + writable', () => {
    const zx = SENSOR_CONFIGS.HOBEIAN_ZG204ZX;
    assert.strictEqual(zx.dpMap[108].setting, 'indicator');
    assert.ok(zx.writableDPs.includes(108));
  });
});
