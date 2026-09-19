'use strict';

/**
 * P2604 — GH#550/#551/#552 integral residual (2026-09-19)
 *
 * Contre quoi:
 * - #550: distance stuck 0 after re-pair because lux-nudge stops once DP9 painted 0m
 * - #550: V3 DP104 mapped as presence (Z2M V3 has no DP104) races lux
 * - #551: button_wireless_3 EP1 IAS 1280/1281/61184 blocks TS0043 famkxci2 match
 * - #552: e3vhyirx+TS130F must stay wall_curtain_switch (not smart_knob / curtain_module)
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2604 GH#550/#551/#552 residual', () => {
  it('gkfbdvyx V3: DP104 not presence; lux nudge re-arms when stuck at 0m', () => {
    const cfg = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/configs.js'), 'utf8');
    const idx = cfg.indexOf('ZY_M100_CEILING_24G');
    const block = cfg.slice(idx, idx + 4000);
    assert.ok(block.includes("104: { cap: null, internal: 'motion_state_v2_compat' }"));
    assert.ok(!/104:\s*\{[\s\S]*?ignorePresenceClear:\s*true/.test(block));
    assert.ok(block.includes("9: { cap: 'measure_luminance.distance', divisor: 10 }"));
    assert.ok(block.includes("103: { cap: 'measure_luminance', type: 'lux_direct' }"));

    const src = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(src.includes('lux-stuck-zero'));
    assert.ok(src.includes('stuckZero'));
    assert.ok(src.includes("const dps = [1, 9, 101, 103]"));
  });

  it('TS0043 famkxci2: button_wireless_3 EP1 has no IAS/EF00 clusters', () => {
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'), 'utf8'),
    );
    const mfrs = compose.zigbee.manufacturerName.map((s) => String(s).toLowerCase());
    assert.ok(mfrs.includes('_tz3000_famkxci2'));
    assert.ok(compose.zigbee.productId.includes('TS0043'));
    const ep1 = compose.zigbee.endpoints['1'].clusters;
    assert.ok(!ep1.includes(1280), 'no IAS Zone');
    assert.ok(!ep1.includes(1281), 'no IAS WD');
    assert.ok(!ep1.includes(61184), 'no EF00 on scene remote EP1');
    assert.ok(ep1.includes(6), 'OnOff for scene press');
  });

  it('e3vhyirx+TS130F: wall_curtain_switch + forbid smart_knob/curtain_module', () => {
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/wall_curtain_switch/driver.compose.json'), 'utf8'),
    );
    const mfrs = compose.zigbee.manufacturerName.map((s) => String(s).toLowerCase());
    assert.ok(mfrs.includes('_tz3000_e3vhyirx'));
    assert.ok(compose.zigbee.productId.includes('TS130F'));
    const ep1 = compose.zigbee.endpoints['1'].clusters;
    assert.ok(ep1.includes(258), 'WindowCovering');
    assert.ok(ep1.includes(6), 'OnOff for Homey match');

    const knob = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/smart_knob/driver.compose.json'), 'utf8'),
    );
    const knobMfr = (knob.zigbee.manufacturerName || []).map((s) => String(s).toLowerCase());
    assert.ok(!knobMfr.includes('_tz3000_e3vhyirx'));
    assert.ok(!(knob.zigbee.productId || []).includes('TS130F'));

    const reg = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'),
    );
    const entry = (reg.entries || reg || []).find?.(
      (e) => e.id === 'p191-ts130f-curtain-quartet-not-shutter-catchall',
    ) || (Array.isArray(reg) ? reg.find((e) => e.id === 'p191-ts130f-curtain-quartet-not-shutter-catchall') : null)
      || Object.values(reg).flat?.().find?.((e) => e && e.id === 'p191-ts130f-curtain-quartet-not-shutter-catchall');

    // registry shape: { entries: [...] } or top-level array under a key
    let found = entry;
    if (!found && reg.misattributions) {
      found = reg.misattributions.find((e) => e.id === 'p191-ts130f-curtain-quartet-not-shutter-catchall');
    }
    if (!found && Array.isArray(reg.rules)) {
      found = reg.rules.find((e) => e.id === 'p191-ts130f-curtain-quartet-not-shutter-catchall');
    }
    // fallback: scan JSON text
    const raw = fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8');
    assert.ok(raw.includes('"canonicalDriver": "wall_curtain_switch"'));
    assert.ok(raw.includes('_TZ3000_e3vhyirx'));
    assert.ok(raw.includes('"smart_knob"'));
    assert.ok(raw.includes('curtain_module'));
  });

  it('nkjintbl: TZE204 plug-only (anti-bot p102) — Contre quoi Auto-Publish', () => {
    const plug = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_plug/driver.compose.json'), 'utf8'),
    );
    const mfrs = (plug.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(mfrs.includes('_tze204_nkjintbl'));
    assert.ok(!mfrs.includes('_tze200_nkjintbl'));
    assert.ok(!mfrs.includes('_tze284_nkjintbl'));
    const antibot = fs.readFileSync(path.join(ROOT, 'tools/ci/anti-bot-regression-gate.js'), 'utf8');
    assert.ok(antibot.includes("id: 'p102-din-not-btn-plug'"));
    assert.ok(antibot.includes("'_TZE200_nkjintbl'"));
  });
});
