'use strict';

/**
 * P2770 init "changed" baseline + availability grace
 * P2771 persistent periodic alarm-pulse guard (opt-in quirk)
 * P2772 cover position slider hidden when no position DP is ever reported
 * P2773 generic "set a device setting" Flow action
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const TG = require('../../lib/flow/TriggerGuards');
const FQ = require('../../lib/quirks/FirmwareQuirks');
const PST = require('../../lib/covers/PositionSupportTracker');
const DSA = require('../../lib/flow/DeviceSettingAction');

function storeDevice(extra = {}) {
  const st = {};
  const caps = new Set(extra.caps || []);
  return Object.assign({
    st, caps,
    getStoreValue: (k) => st[k],
    setStoreValue: async (k, v) => { st[k] = v; },
    hasCapability: (c) => caps.has(c),
    addCapability: async (c) => { caps.add(c); },
    removeCapability: async (c) => { caps.delete(c); },
    log: () => {},
  }, extra.props || {});
}

describe('P2770 init changed baseline', () => {
  it('first *_changed after init is suppressed, the second fires', () => {
    const d = {};
    TG.markInit(d, 1000);
    assert.equal(TG.shouldSuppressChanged(d, 'universal_battery_changed', 2000), true);
    assert.equal(TG.shouldSuppressChanged(d, 'universal_battery_changed', 3000), false);
  });
  it('non-changed cards and late values are never suppressed', () => {
    const d = {};
    TG.markInit(d, 0);
    assert.equal(TG.shouldSuppressChanged(d, 'button_pressed', 10), false);
    assert.equal(TG.shouldSuppressChanged(d, 'x_changed', TG.DEFAULT_INIT_WINDOW_MS + 1), false);
    assert.equal(TG.shouldSuppressChanged({}, 'x_changed', 10), false);
  });
  it('grace resolves with sane defaults and clamps', () => {
    assert.equal(TG.resolveAvailabilityGraceMs(undefined), 120000);
    assert.equal(TG.resolveAvailabilityGraceMs('0'), 0);
    assert.equal(TG.resolveAvailabilityGraceMs('30'), 30000);
    assert.equal(TG.resolveAvailabilityGraceMs(99999), 3600000);
    assert.equal(TG.resolveAvailabilityGraceMs('abc'), 120000);
  });
  it('is wired into the Zigbee trigger path and the availability cards', () => {
    const z = fs.readFileSync(path.join(root, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    assert.match(z, /shouldSuppressChanged\(this, cardId\)/);
    assert.match(z, /markInit\(this\)/);
    const f = fs.readFileSync(path.join(root, 'lib/flow/FeatureFlowCards.js'), 'utf8');
    assert.match(f, /availability_trigger_grace_s/);
    assert.match(f, /_pendingUnavailable/);
  });
});

describe('P2771 alarm pulse guard', () => {
  const q = [{ id: 't', type: 'alarm_pulse_guard', params: { capability: 'alarm_contact', periodMs: 3600000, toleranceMs: 300000 } }];
  it('suppresses a pulse one period after the previous one, persisted in store', () => {
    const d = storeDevice();
    assert.equal(FQ.shouldSuppressAlarmPulse(d, 'alarm_contact', true, 1000, q), false);
    assert.equal(typeof d.st.fwq_pulse_alarm_contact, 'number');
    // simulated restart: new object, same store
    const d2 = storeDevice(); Object.assign(d2.st, d.st);
    assert.equal(FQ.shouldSuppressAlarmPulse(d2, 'alarm_contact', true, 1000 + 3600000 + 60000, q), true);
  });
  it('does not touch other gaps, false values or non-opted devices', () => {
    const d = storeDevice();
    FQ.shouldSuppressAlarmPulse(d, 'alarm_contact', true, 0, q);
    assert.equal(FQ.shouldSuppressAlarmPulse(d, 'alarm_contact', true, 20 * 60000, q), false);
    assert.equal(FQ.shouldSuppressAlarmPulse(d, 'alarm_contact', false, 3600000, q), false);
    assert.equal(FQ.shouldSuppressAlarmPulse(d, 'alarm_contact', true, 3600000, []), false);
  });
});

describe('P2772 cover position support', () => {
  it('hides the slider only after enough movements without position', () => {
    const d = storeDevice({ caps: ['windowcoverings_set'] });
    const t0 = 1e12;
    PST.noteMovement(d, t0);
    for (let i = 1; i < PST.MIN_MOVES - 1; i++) {PST.noteMovement(d, t0 + PST.MIN_AGE_MS + i);}
    assert.ok(d.caps.has('windowcoverings_set'));
    assert.equal(PST.noteMovement(d, t0 + PST.MIN_AGE_MS + 100), true);
  });
  it('never hides when a position was seen; restores when one arrives later', async () => {
    const d = storeDevice({ caps: ['windowcoverings_set'] });
    PST.notePosition(d);
    for (let i = 0; i < PST.MIN_MOVES + 5; i++) {PST.noteMovement(d, 1e12 + PST.MIN_AGE_MS * 2);}
    assert.ok(d.caps.has('windowcoverings_set'));
    const h = storeDevice({ caps: [] });
    h.st.cover_position_hidden = true;
    PST.notePosition(h);
    await new Promise((r) => setImmediate(r));
    assert.ok(h.caps.has('windowcoverings_set'));
  });
  it('ZCL covers are never touched', () => {
    const d = storeDevice({ caps: ['windowcoverings_set'], props: { _zclCoverRegistered: true } });
    for (let i = 0; i < PST.MIN_MOVES + 1; i++) {PST.noteMovement(d, i === 0 ? 0 : PST.MIN_AGE_MS + i);}
    assert.ok(d.caps.has('windowcoverings_set'));
  });
});

describe('P2773 set device setting', () => {
  const manifest = [
    { id: 'sensitivity', type: 'number', min: 1, max: 10, label: { en: 'Sensitivity' } },
    { type: 'group', children: [{ id: 'led', type: 'checkbox', label: 'LED' }, { id: 'mode', type: 'dropdown', values: [{ id: 'low' }, { id: 'high' }] }] },
    { id: 'zb_manufacturer_name', type: 'label' },
    { id: 'zb_model_id', type: 'text' },
  ];
  const mk = () => {
    let s = { sensitivity: 5, led: true, mode: 'low' };
    const calls = [];
    return {
      calls,
      driver: { manifest: { settings: manifest } },
      getSettings: () => s,
      setSettings: async (o) => { s = { ...s, ...o }; },
      onSettings: async (a) => { calls.push(a); },
    };
  };
  it('lists editable settings only', () => {
    const ids = DSA.autocomplete(mk(), '').map((r) => r.id);
    assert.deepEqual(ids, ['sensitivity', 'led', 'mode']);
  });
  it('coerces and calls onSettings', async () => {
    const d = mk();
    const r = await DSA.apply(d, { id: 'sensitivity' }, '7');
    assert.equal(r.value, 7);
    assert.deepEqual(d.calls[0].changedKeys, ['sensitivity']);
    assert.equal((await DSA.apply(d, 'led', 'off')).value, false);
    assert.equal((await DSA.apply(d, 'mode', 'HIGH')).value, 'high');
  });
  it('rejects invalid values and blocked keys', async () => {
    const d = mk();
    await assert.rejects(DSA.apply(d, 'mode', 'medium'));
    await assert.rejects(DSA.apply(d, 'led', 'maybe'));
    await assert.rejects(DSA.apply(d, 'zb_model_id', 'x'));
  });
  it('card is declared in compose', () => {
    const j = JSON.parse(fs.readFileSync(path.join(root, '.homeycompose/flow/actions/device_set_setting.json'), 'utf8'));
    assert.equal(j.id, 'device_set_setting');
  });
});
