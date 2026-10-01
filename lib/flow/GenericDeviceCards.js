'use strict';

/**
 * P2775 — generic, app-level device Flow cards (one card for every driver, keeps the
 * manifest small). Pure helpers + registration; reimplemented from public card lists of
 * other Homey apps (inspiration only, no code copied — see CREDITS.md).
 *
 * Triggers:   capability_crossed_threshold, gang_switched, child_lock_changed, motion_absent_for
 * Conditions: capability_is_between, gang_is_on, child_lock_is_on
 * Actions:    gang_set, child_lock_set, backlight_set
 *
 * Fed by FeatureFlowCards.triggerCapabilityChanged() (the existing generic capability
 * observer). Everything is soft: a failure never blocks a capability update.
 */

const { safeSetTimeout, safeClearTimeout } = require('../utils/safe-timers');

const MSG = {
  no_capability: { en: 'This device has no "{cap}" capability', fr: 'Cet appareil n\'a pas la capacité « {cap} »', nl: 'Dit apparaat heeft geen capaciteit "{cap}"', de: 'Dieses Gerät hat keine Fähigkeit „{cap}“' },
  no_gang: { en: 'This device has no gang {gang}', fr: 'Cet appareil n\'a pas de voie {gang}', nl: 'Dit apparaat heeft geen kanaal {gang}', de: 'Dieses Gerät hat keinen Kanal {gang}' },
  no_child_lock: { en: 'This device has no child lock', fr: 'Cet appareil n\'a pas de verrouillage enfant', nl: 'Dit apparaat heeft geen kinderslot', de: 'Dieses Gerät hat keine Kindersicherung' },
  no_backlight: { en: 'This device has no backlight setting', fr: 'Cet appareil n\'a pas de réglage de rétroéclairage', nl: 'Dit apparaat heeft geen instelling voor achtergrondverlichting', de: 'Dieses Gerät hat keine Einstellung für die Hintergrundbeleuchtung' },
  bad_range: { en: 'Minimum must be lower than or equal to maximum', fr: 'Le minimum doit être inférieur ou égal au maximum', nl: 'Minimum moet kleiner dan of gelijk aan maximum zijn', de: 'Minimum muss kleiner oder gleich Maximum sein' },
};

function t(code, params = {}, lang = 'en') {
  const m = MSG[code] || { en: code };
  let s = m[lang] || m.en;
  for (const [k, v] of Object.entries(params)) {s = s.split(`{${k}}`).join(String(v));}
  return s;
}

function deviceIdOf(device) {
  try { return (device && device.getData && device.getData() && device.getData().id) || (device && (device.id || device.__id)) || null; } catch (_e) { return null; }
}

function sameDevice(argDevice, deviceId) {
  if (!argDevice || !deviceId) {return false;}
  const id = deviceIdOf(argDevice);
  return id === deviceId || argDevice.id === deviceId;
}

function capId(arg) {
  return arg && typeof arg === 'object' ? arg.id : arg;
}

function toNum(v) {
  if (v === null || v === undefined || v === '') {return null;}
  if (typeof v === 'boolean') {return v ? 1 : 0;}
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Numeric capabilities of a device, for autocomplete. */
function numericCapabilities(device, query = '') {
  const q = String(query || '').toLowerCase();
  let caps = [];
  try { caps = device.getCapabilities() || []; } catch (_e) { caps = []; }
  return caps
    .filter((c) => /^(measure_|meter_|dim|target_temperature|windowcoverings_set|volume_set|light_temperature)/.test(c)
      || typeof safeValue(device, c) === 'number')
    .filter((c) => !q || c.toLowerCase().includes(q))
    .slice(0, 60)
    .map((c) => {
      let name = c;
      try { const o = device.getCapabilityOptions?.(c); const ti = o && o.title; if (ti) {name = `${typeof ti === 'string' ? ti : ti.en || c} (${c})`;} } catch (_e) { /* soft */ }
      return { id: c, name };
    });
}

function safeValue(device, cap) {
  try { return device.getCapabilityValue(cap); } catch (_e) { return undefined; }
}

/** true when old → new crosses `threshold` in `direction` ('above' | 'below'). */
function crossed(oldV, newV, threshold, direction) {
  const o = toNum(oldV); const n = toNum(newV); const th = toNum(threshold);
  if (o === null || n === null || th === null) {return false;}
  if (direction === 'below') {return o >= th && n < th;}
  return o <= th && n > th;
}

function isBetween(value, min, max) {
  const v = toNum(value); const a = toNum(min); const b = toNum(max);
  if (v === null || a === null || b === null) {return false;}
  return v >= a && v <= b;
}

/** Capability id for gang N (1-based) on a device, or null. */
function gangCapability(device, gang) {
  const n = Math.round(Number(gang));
  if (!Number.isFinite(n) || n < 1) {return null;}
  const has = (c) => { try { return device.hasCapability(c); } catch (_e) { return false; } };
  const cands = [`onoff.gang${n}`, `onoff.${n}`, `onoff.channel${n}`, `onoff.socket${n}`];
  if (n === 1) {cands.push('onoff');}
  return cands.find(has) || null;
}

/** Gang number for an on/off capability id, or null. */
function gangOf(capability) {
  const c = String(capability || '');
  if (c === 'onoff') {return 1;}
  const m = c.match(/^onoff\.(?:gang|channel|socket)?(\d+)$/);
  return m ? Number(m[1]) : null;
}

async function setCapability(device, cap, value) {
  // Prefer the registered listener so the value reaches the physical device.
  if (typeof device.triggerCapabilityListener === 'function') {
    await device.triggerCapabilityListener(cap, value);
  } else {
    await device.setCapabilityValue(cap, value);
  }
}

function backlightPlan(device, mode) {
  const DSA = require('./DeviceSettingAction');
  const ids = new Map(DSA.editableSettings(device).map((s) => [s.id, s]));
  const on = mode !== 'off';
  if (ids.has('backlight_mode')) {
    const vals = (ids.get('backlight_mode').values || []).map((v) => v.id);
    const want = mode === 'on' ? 'normal' : mode;
    return { id: 'backlight_mode', value: vals.includes(want) ? want : on ? vals.find((v) => v !== 'off') || 'normal' : 'off' };
  }
  for (const id of ['backlight', 'moes_backlight', 'backlight_switch', 'indicator_light']) {
    if (!ids.has(id)) {continue;}
    const s = ids.get(id);
    if (s.type === 'checkbox') {return { id, value: on ? 'true' : 'false' };}
    if (s.type === 'dropdown') {
      const vals = (s.values || []).map((v) => String(v.id));
      const pick = on ? vals.find((v) => /^(1|on|true|normal)$/i.test(v)) || vals.find((v) => !/^(0|off|false)$/i.test(v))
        : vals.find((v) => /^(0|off|false)$/i.test(v));
      if (pick !== undefined) {return { id, value: pick };}
    }
  }
  return null;
}

class GenericDeviceCards {
  constructor(host) {
    this.host = host; // FeatureFlowCards instance
    this.homey = host.homey;
    this._motionTimers = new Map(); // deviceId -> [timers]
  }

  lang() {
    try { return this.homey.i18n?.getLanguage?.() || 'en'; } catch (_e) { return 'en'; }
  }

  err(code, params) {
    return new Error(t(code, params, this.lang()));
  }

  _card(type, id) {
    try {
      if (type === 'trigger') {return this.homey.flow.getTriggerCard(id);}
      if (type === 'condition') {return this.homey.flow.getConditionCard(id);}
      return this.homey.flow.getActionCard(id);
    } catch (_e) { return null; }
  }

  /** Register a run listener that may throw (clear Flow error), once. */
  _reg(type, id, fn, autocomplete = {}) {
    const bucket = type === 'trigger' ? this.host._registered.triggers
      : type === 'condition' ? this.host._registered.conditions : this.host._registered.actions;
    if (bucket.has(id)) {return;}
    const card = this._card(type, id);
    if (!card || card.__flowGuardNoop) {return;}
    try { card.registerRunListener(fn); } catch (e) { if (!/already registered/i.test(String(e.message || e))) {return;} }
    for (const [arg, ac] of Object.entries(autocomplete)) {
      try { card.registerArgumentAutocompleteListener(arg, async (q, args) => { try { return ac(q, args); } catch (_e) { return []; } }); } catch (_e) { /* soft */ }
    }
    bucket.add(id);
  }

  register() {
    const numAC = (q, args) => numericCapabilities(args && args.device, q);

    // Triggers
    this._reg('trigger', 'capability_crossed_threshold', async (args, state) =>
      sameDevice(args.device, state.deviceId) && capId(args.capability) === state.capability
      && crossed(state.old, state.value, args.threshold, args.direction), { capability: numAC });
    this._reg('trigger', 'gang_switched', async (args, state) =>
      sameDevice(args.device, state.deviceId) && Number(args.gang) === state.gang
      && (args.state === 'any' || args.state === (state.on ? 'on' : 'off')));
    this._reg('trigger', 'child_lock_changed', async (args, state) =>
      sameDevice(args.device, state.deviceId) && (args.state === 'any' || args.state === (state.on ? 'on' : 'off')));
    this._reg('trigger', 'motion_absent_for', async (args, state) =>
      sameDevice(args.device, state.deviceId) && Number(args.minutes) === state.minutes);

    // Conditions
    this._reg('condition', 'capability_is_between', async (args) => {
      const cap = capId(args.capability);
      if (!args.device?.hasCapability?.(cap)) {throw this.err('no_capability', { cap });}
      if (toNum(args.min) > toNum(args.max)) {throw this.err('bad_range');}
      return isBetween(args.device.getCapabilityValue(cap), args.min, args.max);
    }, { capability: numAC });
    this._reg('condition', 'gang_is_on', async (args) => {
      const cap = gangCapability(args.device, args.gang);
      if (!cap) {throw this.err('no_gang', { gang: args.gang });}
      return args.device.getCapabilityValue(cap) === true;
    });
    this._reg('condition', 'child_lock_is_on', async (args) => {
      const d = args.device;
      if (d?.hasCapability?.('child_lock')) {return d.getCapabilityValue('child_lock') === true;}
      const s = d?.getSettings?.() || {};
      if ('child_lock' in s) {return s.child_lock === true || s.child_lock === '1' || s.child_lock === 1;}
      throw this.err('no_child_lock');
    });

    // Actions
    this._reg('action', 'gang_set', async (args) => {
      const cap = gangCapability(args.device, args.gang);
      if (!cap) {throw this.err('no_gang', { gang: args.gang });}
      const v = args.action === 'toggle' ? !(args.device.getCapabilityValue(cap) === true) : args.action === 'on';
      await setCapability(args.device, cap, v);
      return true;
    });
    this._reg('action', 'child_lock_set', async (args) => {
      const d = args.device; const on = args.state === 'on';
      if (d?.hasCapability?.('child_lock')) { await setCapability(d, 'child_lock', on); return true; }
      const DSA = require('./DeviceSettingAction');
      if (DSA.editableSettings(d).some((s) => s.id === 'child_lock')) {
        await DSA.apply(d, 'child_lock', on ? 'true' : 'false', this.lang());
        return true;
      }
      throw this.err('no_child_lock');
    });
    this._reg('action', 'backlight_set', async (args) => {
      const plan = backlightPlan(args.device, args.mode);
      if (!plan) {throw this.err('no_backlight');}
      await require('./DeviceSettingAction').apply(args.device, plan.id, plan.value, this.lang());
      return true;
    });

    // Prime the argument caches so the first event after start is not missed.
    for (const id of ['capability_crossed_threshold', 'gang_switched', 'child_lock_changed']) {this._argsFor(id);}
  }

  /**
   * Cached argument values of a trigger card (only Flows that use it). Refreshed at most
   * every 60 s and on card updates, so busy capabilities do not call trigger() for nothing.
   */
  _argsFor(id) {
    if (!this._args) {this._args = new Map();}
    const now = Date.now();
    const e = this._args.get(id);
    if (e && now - e.at < 60000) {return e.values;}
    const entry = { at: now, values: e ? e.values : [] };
    this._args.set(id, entry);
    try {
      const card = this._card('trigger', id);
      if (card && !card.__p2775UpdHook && typeof card.on === 'function') {
        card.on('update', () => { try { this._args.delete(id); } catch (_e) { /* soft */ } });
        card.__p2775UpdHook = true;
      }
      Promise.resolve(card && card.getArgumentValues ? card.getArgumentValues() : []).then((v) => {
        entry.values = Array.isArray(v) ? v : [];
      }).catch(() => {});
    } catch (_e) { /* soft */ }
    return entry.values;
  }

  _wanted(id, deviceId, pred = () => true) {
    try { return this._argsFor(id).some((a) => sameDevice(a.device, deviceId) && pred(a)); } catch (_e) { return false; }
  }

  /** Called for every capability change by the generic observer. */
  onCapabilityChanged(device, deviceId, capability, value, oldValue) {
    try {
      if (oldValue !== undefined && oldValue !== null && toNum(value) !== null && typeof value !== 'boolean'
          && this._wanted('capability_crossed_threshold', deviceId, (a) => capId(a.capability) === capability
            && crossed(oldValue, value, a.threshold, a.direction))) {
        this._fire('capability_crossed_threshold', { value: toNum(value), previous: toNum(oldValue), capability },
          { deviceId, capability, value, old: oldValue }, device);
      }
      const g = gangOf(capability);
      if (g !== null && typeof value === 'boolean' && value !== oldValue && this._wanted('gang_switched', deviceId, (a) => Number(a.gang) === g)) {
        this._fire('gang_switched', { gang: g, state: value ? 'on' : 'off' }, { deviceId, gang: g, on: value });
      }
      if (capability === 'child_lock' && typeof value === 'boolean' && value !== oldValue && this._wanted('child_lock_changed', deviceId)) {
        this._fire('child_lock_changed', { state: value ? 'on' : 'off' }, { deviceId, on: value });
      }
      if (capability === 'alarm_motion' && typeof value === 'boolean') {
        if (value) {this._clearMotion(deviceId);} else if (oldValue === true) {this._armMotion(device, deviceId);}
      }
    } catch (_e) { /* soft */ }
  }

  _fire(id, tokens, state) {
    try {
      if (!this.host._registered.triggers.has(id)) {return;}
      const card = this._card('trigger', id);
      if (!card || card.__flowGuardNoop) {return;}
      const p = card.trigger(tokens, state);
      if (p && p.catch) {p.catch(() => {});}
    } catch (_e) { /* soft */ }
  }

  _clearMotion(deviceId) {
    const list = this._motionTimers.get(deviceId);
    if (list) {list.forEach((h) => safeClearTimeout(this.homey, h));}
    this._motionTimers.delete(deviceId);
  }

  async _armMotion(device, deviceId) {
    this._clearMotion(deviceId);
    if (!this.host._registered.triggers.has('motion_absent_for')) {return;}
    let values = [];
    try {
      const card = this._card('trigger', 'motion_absent_for');
      values = await card.getArgumentValues() || [];
    } catch (_e) { values = []; }
    const minutes = [...new Set(values.filter((a) => sameDevice(a.device, deviceId)).map((a) => Math.round(Number(a.minutes))))]
      .filter((m) => Number.isFinite(m) && m >= 1 && m <= 1440);
    const timers = minutes.map((m) => safeSetTimeout(this.homey, () => {
      try {
        if (device && device.getCapabilityValue && device.getCapabilityValue('alarm_motion') === true) {return;}
        this._fire('motion_absent_for', { minutes: m }, { deviceId, minutes: m });
      } catch (_e) { /* soft */ }
    }, m * 60000));
    if (timers.length) {this._motionTimers.set(deviceId, timers);}
  }
}

module.exports = {
  GenericDeviceCards, crossed, isBetween, gangCapability, gangOf, backlightPlan, numericCapabilities, sameDevice, t, MSG,
};
