'use strict';

/**
 * P2587 — VicHY dual Contre quoi (T140352 #2242/#2246)
 * (A) Homey Rideau/curtain class+cap cache flip ≠ Occupied setting
 * (B) Bathroom sticky presence: VMC micro-jitter / departure delay / lux still moves
 * Couple family: clrdrnya + dtzziy1e + TS0601 → presence_sensor_radar only
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEVICE = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');
const CONFIGS = path.join(ROOT, 'drivers/presence_sensor_radar/configs.js');
const SETTINGS = path.join(ROOT, 'drivers/presence_sensor_radar/driver.settings.compose.json');
const CURTAIN = path.join(ROOT, 'drivers/curtain_motor/driver.compose.json');
const REG = path.join(ROOT, 'data/user-misattribution-registry.json');

describe('P2587 VicHY dual curtain + sticky bathroom', () => {
  it('MTG family regex includes dtzziy1e (Z2M MTG075 alternate)', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('MTG_RELAY_MFR_RE'), 'shared MTG regex');
    assert.match(src, /dtzziy1e/);
    assert.ok(src.includes('P2587'), 'WHY tag');
  });

  it('curtain-flip heal restores profile + burst + soft-clear micro-jitter', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('_armCurtainFlipBurstHeal'), 'burst heal');
    assert.ok(src.includes('_trySoftClearMicroJitter'), 'VMC micro-jitter');
    assert.ok(src.includes('P2587 soft-clear (VMC/micro-jitter'), 'log tag');
    assert.ok(src.includes('_applyRadarCapabilityProfile'), 'restore presence caps after heal');
  });

  it('configs expose micro-jitter soft-clear knobs', () => {
    const src = fs.readFileSync(CONFIGS, 'utf8');
    assert.ok(src.includes('softClearMicroJitterMs'));
    assert.ok(src.includes('_TZE200_dtzziy1e'));
  });

  it('settings distinguish Rideau re-pair from bathroom sticky', () => {
    const settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
    const help = settings.find((s) => s.id === 'homey_curtain_flip_help');
    assert.ok(help && help.type === 'label', 'help label');
    assert.match(help.label.en, /Curtain|Rideau|re-pair/i);
    const dep = settings.find((s) => s.id === 'departure_delay');
    assert.match(dep.hint.en, /VMC|bathroom|frozen/i);
  });

  it('clrdrnya and dtzziy1e never in curtain_motor compose', () => {
    const curtain = JSON.parse(fs.readFileSync(CURTAIN, 'utf8'));
    const mfrs = curtain.zigbee?.manufacturerName || [];
    assert.ok(!mfrs.some((m) => /clrdrnya/i.test(m)), 'no clrdrnya on curtain');
    assert.ok(!mfrs.some((m) => /dtzziy1e/i.test(m)), 'no dtzziy1e on curtain');
  });

  it('misattribution forbids curtain for both couples', () => {
    const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
    const list = reg.cases || [];
    const vichy = list.find((e) => e.id === 'vichy-clrdrnya-presence');
    const dtz = list.find((e) => e.id === 'mtg075-dtzziy1e-presence');
    assert.ok(vichy, 'vichy entry');
    assert.ok(vichy.forbiddenDrivers.includes('curtain_motor'));
    assert.ok(dtz, 'dtzziy1e entry');
    assert.ok(dtz.forbiddenDrivers.includes('curtain_motor'));
    assert.strictEqual(dtz.canonicalDriver, 'presence_sensor_radar');
  });
});
