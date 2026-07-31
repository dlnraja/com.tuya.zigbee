'use strict';

/**
 * Tests — P92.64 button cross-source enrichment
 * Pins every fix imported from the cross-referenced research:
 *  - z2m #8072: no battery reporting config on sleepy button remotes
 *  - z2m #20024: TSN ring (last 5) for out-of-order retransmits
 *  - Hubitat kkossev: 1200ms debounce profiles for flaky TS0044/43 mfrs
 *  - packetninja/dlnraja#121: _TZ3000_an5rjiwd routed to button_wireless_4
 *  - packetninja e8cdb89f: switch_4gang multi-press flow cards exist
 *  - forum #1242/#907: HOBEIAN ZG-101ZL pairing + 0xE001 raw path
 *  - z2m configureMagicPacket: Tuya magic packet on init
 *  - ZHA ts004f: rotation speed token on knob triggers
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('P92.64 — button cross-source enrichment', () => {

  it('z2m #8072: BatteryRouter skips reporting config on sleepy button devices', () => {
    const src = read('lib/helpers/BatteryRouter.js');
    assert.ok(src.includes('z2m #8072'), 'z2m #8072 reference present');
    assert.ok(src.includes('isSleepyButton'), 'sleepy-button guard present');
    // The guard must appear BEFORE the configureAttributeReporting call
    const guardIdx = src.indexOf('isSleepyButton');
    const configIdx = src.indexOf('configureAttributeReporting', guardIdx);
    assert.ok(guardIdx > -1 && configIdx > guardIdx, 'guard precedes reporting config');
  });

  it('z2m #8072: smart_knob does not configure battery reporting', () => {
    const src = read('drivers/smart_knob_rotary/device.js');
    const m = src.match(/async _setupBatteryReporting[\s\S]*?\n  \}/);
    assert.ok(m, '_setupBatteryReporting found');
    assert.ok(!/\.configureReporting\s*\(/.test(m[0]), 'no configureReporting call in battery setup');
    assert.ok(/readAttributes/.test(m[0]), 'initial read kept');
  });

  it('z2m #20024: TSN dedup keeps a ring of 5 per gang', () => {
    const src = read('lib/mixins/PhysicalButtonMixin.js');
    assert.ok(src.includes('_lastTSNRing'), 'TSN ring present');
    assert.ok(src.includes('while (ring.length > 5)'), 'ring bounded to 5');
  });

  it('Hubitat kkossev: flaky TS0044/43 mfrs have 1200ms debounce profiles', () => {
    const src = read('lib/mixins/PhysicalButtonMixin.js');
    for (const mfr of ['_TZ3000_vp6clf9d', '_TZ3000_ur5fpg7p', '_TZ3000_wkai4ga5', '_TZ3000_gbm10jnj']) {
      const idx = src.indexOf(`'${mfr}':`);
      assert.ok(idx > -1, `${mfr} profile exists`);
      const block = src.slice(idx, idx + 400);
      assert.ok(block.includes('debounceMs: 1200'), `${mfr} has debounceMs 1200`);
    }
    // _isDebounced must be profile-aware
    assert.ok(src.includes('getDeviceProfile?.()?.debounceMs'), 'profile-aware debounce');
  });

  it('dlnraja#121: _TZ3000_an5rjiwd is in button_wireless_4, not switch_1gang', () => {
    const b4 = JSON.parse(read('drivers/button_wireless_4/driver.compose.json'));
    const s1 = JSON.parse(read('drivers/switch_1gang/driver.compose.json'));
    const b4m = b4.zigbee.manufacturerName;
    assert.ok(b4m.includes('_TZ3000_an5rjiwd'), 'canonical present');
    assert.ok(b4m.includes('_TZ3000_AN5RJIWD'), 'upper present');
    assert.ok(b4m.includes('_tz3000_an5rjiwd'), 'lower present');
    assert.ok(!s1.zigbee.manufacturerName.some((m) => /an5rjiwd/i.test(m)), 'removed from switch_1gang');
  });

  it('packetninja: switch_4gang has all 16 multi-press physical cards fired by the mixin', () => {
    const f = JSON.parse(read('drivers/switch_4gang/driver.flow.compose.json'));
    const ids = new Set(f.triggers.map((t) => t.id));
    for (let g = 1; g <= 4; g++) {
      for (const type of ['single', 'double', 'long', 'triple']) {
        const id = `switch_4gang_physical_gang${g}_${type}`;
        assert.ok(ids.has(id), `missing ${id}`);
      }
    }
  });

  it('forum #1242: HOBEIAN pairs via button_wireless_1 and E001 raw path exists', () => {
    const c = JSON.parse(read('drivers/button_wireless_1/driver.compose.json'));
    assert.ok(c.zigbee.manufacturerName.includes('HOBEIAN'), 'HOBEIAN mfr claimed');
    const src = read('lib/mixins/PhysicalButtonMixin.js');
    assert.ok(src.includes('clusterId === 0xE001'), 'E001 captured in L1 raw path');
    assert.ok(src.includes('raw_e001_'), 'E001 dedup key');
  });

  it('z2m magic packet: one-shot genBasic read on init for Tuya-mfr devices', () => {
    const src = read('lib/mixins/PhysicalButtonMixin.js');
    assert.ok(src.includes('_sendTuyaMagicPacket'), 'magic packet method present');
    assert.ok(src.includes('0xfffe'), 'attrReportingStatus 0xfffe included');
    assert.ok(src.includes('_magicPacketSent'), 'one-shot guard');
  });

  it('ZHA ts004f: knob rotate triggers carry a speed token', () => {
    const f = JSON.parse(read('drivers/smart_knob_rotary/driver.flow.compose.json'));
    for (const t of f.triggers) {
      if (/rotate/.test(t.id)) {
        const tokens = t.tokens || t.args || [];
        assert.ok(tokens.some((a) => a.name === 'speed' && a.type === 'string'),
          `${t.id} has string speed token`);
      }
    }
    const src = read('drivers/smart_knob_rotary/device.js');
    assert.ok(src.includes('_lastRotationSpeed'), 'speed detection wired');
    assert.ok(src.includes("'slow'") && src.includes("'fast'"), 'slow/fast mapping (ZHA 13/37)');
  });

  it('SCENE_MODE_RESEARCH #1: manual mode toggle (0x8004) is watched and synced', () => {
    const src = read('lib/devices/ButtonDevice.js');
    assert.ok(src.includes('_registerSceneModeAttributeListener'), 'mode attribute listener registered');
    assert.ok(src.includes('Manual mode toggle detected'), 'manual toggle handled');
    assert.ok(src.includes('scene_mode_switch_failed'), 'failure flag persisted for diagnostics (#3)');
  });

  it('Hubitat: reverse_button_order setting exists and remaps at the central router', () => {
    const src = read('lib/devices/ButtonDevice.js');
    assert.ok(src.includes("getSetting?.('reverse_button_order')"), 'setting read in triggerButtonPress');
    assert.ok(src.includes('gangs + 1 - button'), 'reverse mapping formula');
    for (const d of ['button_wireless_2', 'button_wireless_3', 'button_wireless_4', 'button_wireless_6', 'button_wireless_8']) {
      const c = JSON.parse(read(`drivers/${d}/driver.compose.json`));
      assert.ok((c.settings || []).some((s) => s.id === 'reverse_button_order'),
        `${d} exposes the setting`);
    }
  });

  it('Hue RWL022/Aqara: dropdown matrix card exists, covers all states, and is fired centrally', () => {
    const card = JSON.parse(read('.homeycompose/flow/triggers/button_matrix.json'));
    assert.strictEqual(card.id, 'button_matrix');
    const actions = card.args.find((a) => a.name === 'action').values.map((v) => v.id);
    for (const a of ['single', 'double', 'long', 'triple', 'release']) {
      assert.ok(actions.includes(a), `matrix covers ${a}`);
    }
    const buttons = card.args.find((a) => a.name === 'button').values.map((v) => v.id);
    assert.deepStrictEqual(buttons, ['1', '2', '3', '4', '5', '6', '7', '8']);
    const src = read('lib/devices/ButtonDevice.js');
    assert.ok(src.includes("'button_matrix'"), 'matrix fired from triggerButtonPress');
    assert.ok(src.includes("action: 'release'"), 'matrix fired for hold-release');
    // _tryCard must tolerate both device-card and app-card (device arg) semantics
    assert.ok(src.includes('getTriggerCard(cardId)'), 'dual-semantics fallback in _tryCard');
  });
});
