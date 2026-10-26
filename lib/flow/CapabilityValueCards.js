'use strict';

/**
 * P3065 flow uplift (t569u/t570u) — three generic, app-level cards that cover EVERY capability of
 * every driver, including sub-capabilities (per gang / channel / phase: onoff.gang2, measure_power.l1)
 * and app-defined custom capabilities (child_lock, power_on_behavior, finger_bot_mode, hvac_system_mode,
 * thermostat_preset, alarm_human, measure_voc, tuya_dp_*...), which Homey gives no system cards.
 * One card per kind instead of one per driver keeps app.json small.
 *
 *   trigger   capability_value_delta  — [[capability]] changed by at least [[min_delta]]
 *                                       tokens: value, previous, delta (signed), text, capability
 *   condition capability_value_is     — [[capability]] is [[value]] (enum/boolean/number/text, autocomplete)
 *   action    capability_value_set    — set [[capability]] to [[value]] (setable only, enum/bounds checked)
 *
 * Reuses the P2775 GenericDeviceCards plumbing (_reg, _wanted, _fire, sameDevice). Pattern
 * (capability + value autocomplete) is the Homey SDK autocomplete-argument model; idea from public card
 * lists of other Homey apps (Johan Bendz's Tuya Zigbee app among them) — no code copied.
 * Everything is soft: a failure never blocks a capability update; run listeners throw a clear error.
 */

const { GenericDeviceCards, sameDevice } = require('./GenericDeviceCards');

const MSG = {
  no_capability: { en: 'This device has no "{cap}" capability', fr: 'Cet appareil n\'a pas la capacité « {cap} »', nl: 'Dit apparaat heeft geen capaciteit "{cap}"', de: 'Dieses Gerät hat keine Fähigkeit „{cap}“' },
  not_setable: { en: '"{cap}" can not be set from a Flow', fr: '« {cap} » ne peut pas être réglé depuis un Flow', nl: '"{cap}" kan niet vanuit een Flow worden ingesteld', de: '„{cap}“ kann nicht per Flow gesetzt werden' },
  bad_value: { en: '"{value}" is not a valid value for "{cap}"', fr: '« {value} » n\'est pas une valeur valide pour « {cap} »', nl: '"{value}" is geen geldige waarde voor "{cap}"', de: '„{value}“ ist kein gültiger Wert für „{cap}“' },
  out_of_range: { en: '{value} is outside {min}–{max} for "{cap}"', fr: '{value} est hors de {min}–{max} pour « {cap} »', nl: '{value} ligt buiten {min}–{max} voor "{cap}"', de: '{value} liegt außerhalb {min}–{max} für „{cap}“' },
};

const MAX_LIST = 80;
// System capabilities that Homey lets a Flow set (custom ones use their manifest `setable`).
const SYSTEM_SETABLE = /^(onoff|dim|light_hue|light_saturation|light_temperature|light_mode|target_temperature|thermostat_mode|windowcoverings_set|windowcoverings_state|windowcoverings_tilt_set|volume_set|volume_mute|locked|fan_speed|fan_mode|speaker_playing|channel_up|channel_down)(\.|$)/;
const NEVER_SET = /^(measure_|meter_|alarm_|button(\.|$))/;

function argId(a) { return a && typeof a === 'object' ? a.id : a; }

function toNum(v) {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') {return null;}
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseBool(v) {
  const s = String(v).trim().toLowerCase();
  if (['true', 'on', '1', 'yes', 'aan', 'an', 'oui', 'ja'].includes(s)) {return true;}
  if (['false', 'off', '0', 'no', 'uit', 'aus', 'non', 'nee', 'nein'].includes(s)) {return false;}
  return null;
}

function localized(x, lang) {
  if (!x) {return '';}
  if (typeof x === 'string') {return x;}
  return x[lang] || x.en || Object.values(x)[0] || '';
}

/** Merged definition of a capability on a device: app manifest (custom caps) + per-device options. */
function capDef(device, homey, cap) {
  const base = String(cap).split('.')[0];
  let man = {};
  try { man = (homey && homey.manifest && homey.manifest.capabilities && homey.manifest.capabilities[base]) || {}; } catch (_e) { man = {}; }
  let opt = {};
  try { opt = (device && device.getCapabilityOptions && device.getCapabilityOptions(cap)) || {}; } catch (_e) { opt = {}; }
  const def = { ...man, ...opt };
  if (!def.type) {
    let v;
    try { v = device.getCapabilityValue(cap); } catch (_e) { v = undefined; }
    def.type = typeof v === 'boolean' ? 'boolean' : typeof v === 'number' ? 'number' : typeof v === 'string' ? 'string' : undefined;
    if (!def.type && /^(onoff|alarm_|locked|volume_mute)/.test(base)) {def.type = 'boolean';}
    if (!def.type && /^(measure_|meter_|dim|target_|light_hue|light_saturation|light_temperature|volume_set|windowcoverings_set)/.test(base)) {def.type = 'number';}
  }
  def.custom = !!(man && Object.keys(man).length);
  return def;
}

function isSetable(device, homey, cap) {
  const def = capDef(device, homey, cap);
  if (def.setable === false) {return false;}
  if (def.custom) {return def.setable === true;}
  if (NEVER_SET.test(cap)) {return false;}
  return def.setable === true || SYSTEM_SETABLE.test(cap);
}

function capabilityList(device, homey, q = '', lang = 'en', onlySetable = false) {
  let caps = [];
  try { caps = device.getCapabilities() || []; } catch (_e) { caps = []; }
  const query = String(q || '').toLowerCase();
  const out = [];
  for (const c of caps) {
    if (onlySetable && !isSetable(device, homey, c)) {continue;}
    const def = capDef(device, homey, c);
    const title = localized(def.title, lang);
    const name = title ? `${title} (${c})` : c;
    if (query && !name.toLowerCase().includes(query)) {continue;}
    out.push({ id: c, name });
    if (out.length >= MAX_LIST) {break;}
  }
  return out;
}

/** Value choices for one capability: enum values, on/off, or the typed number (clamped). */
function valueList(device, homey, cap, q = '', lang = 'en') {
  if (!cap) {return [];}
  const def = capDef(device, homey, cap);
  const query = String(q || '').trim();
  if (def.type === 'enum' && Array.isArray(def.values)) {
    return def.values.map((v) => ({ id: String(v.id), name: localized(v.title, lang) || String(v.id) }))
      .filter((v) => !query || `${v.id} ${v.name}`.toLowerCase().includes(query.toLowerCase())).slice(0, MAX_LIST);
  }
  if (def.type === 'boolean') {
    const on = { en: 'On / yes', fr: 'Activé / oui', nl: 'Aan / ja', de: 'An / ja' };
    const off = { en: 'Off / no', fr: 'Désactivé / non', nl: 'Uit / nee', de: 'Aus / nein' };
    return [{ id: 'true', name: localized(on, lang) }, { id: 'false', name: localized(off, lang) }];
  }
  if (def.type === 'number') {
    const n = toNum(query.replace(',', '.'));
    const range = Number.isFinite(def.min) && Number.isFinite(def.max) ? ` (${def.min}–${def.max}${def.units ? ` ${localized(def.units, lang)}` : ''})` : '';
    return n === null ? [] : [{ id: String(n), name: `${n}${range}` }];
  }
  return query ? [{ id: query, name: query }] : [];
}

/** Coerce + bound-check a Flow value for a capability. Returns { ok, value } or { ok:false, code, params }. */
function coerce(def, cap, raw) {
  const s = String(raw === undefined || raw === null ? '' : raw).trim();
  if (def.type === 'boolean') {
    const b = parseBool(s);
    return b === null ? { ok: false, code: 'bad_value', params: { cap, value: s } } : { ok: true, value: b };
  }
  if (def.type === 'enum') {
    const vals = Array.isArray(def.values) ? def.values.map((v) => String(v.id)) : [];
    if (vals.length && !vals.includes(s)) {return { ok: false, code: 'bad_value', params: { cap, value: s } };}
    return { ok: true, value: s };
  }
  if (def.type === 'number') {
    const n = toNum(s.replace(',', '.'));
    if (n === null) {return { ok: false, code: 'bad_value', params: { cap, value: s } };}
    if ((Number.isFinite(def.min) && n < def.min) || (Number.isFinite(def.max) && n > def.max)) {
      return { ok: false, code: 'out_of_range', params: { cap, value: n, min: def.min, max: def.max } };
    }
    return { ok: true, value: n };
  }
  return { ok: true, value: s.slice(0, 255) };
}

/** Does the current value match the Flow value? */
function matches(def, current, raw) {
  if (current === undefined || current === null) {return false;}
  if (typeof current === 'boolean') {return parseBool(raw) === current;}
  if (typeof current === 'number') {const n = toNum(String(raw).replace(',', '.')); return n !== null && Math.abs(n - current) < 1e-9;}
  return String(current).toLowerCase() === String(raw).trim().toLowerCase();
}

/** Tokens for a change. Number tokens are 0 when the value is not numeric (text has the raw value). */
function deltaTokens(capability, value, oldValue) {
  const n = typeof value === 'boolean' ? (value ? 1 : 0) : toNum(value);
  const o = typeof oldValue === 'boolean' ? (oldValue ? 1 : 0) : toNum(oldValue);
  return {
    value: n === null ? 0 : n,
    previous: o === null ? 0 : o,
    delta: n !== null && o !== null ? Math.round((n - o) * 1e6) / 1e6 : 0,
    text: value === undefined || value === null ? '' : String(value).slice(0, 255),
    capability: String(capability),
  };
}

function deltaPasses(minDelta, value, oldValue) {
  const md = toNum(minDelta) || 0;
  if (md <= 0) {return true;}
  const n = toNum(value); const o = toNum(oldValue);
  return n !== null && o !== null && Math.abs(n - o) >= md;
}

class CapabilityValueCards extends GenericDeviceCards {
  err(code, params) {
    const m = MSG[code] || { en: code };
    let s = m[this.lang()] || m.en;
    for (const [k, v] of Object.entries(params || {})) {s = s.split(`{${k}}`).join(String(v));}
    return new Error(s);
  }

  register() {
    const lang = () => this.lang();
    const capAC = (q, args) => capabilityList(args && args.device, this.homey, q, lang(), false);
    const setAC = (q, args) => capabilityList(args && args.device, this.homey, q, lang(), true);
    const valAC = (q, args) => valueList(args && args.device, this.homey, argId(args && args.capability), q, lang());

    this._reg('trigger', 'capability_value_delta', async (args, state) =>
      sameDevice(args.device, state.deviceId) && argId(args.capability) === state.capability
      && deltaPasses(args.min_delta, state.value, state.old), { capability: capAC });

    this._reg('condition', 'capability_value_is', async (args) => {
      const cap = argId(args.capability);
      if (!args.device?.hasCapability?.(cap)) {throw this.err('no_capability', { cap });}
      const def = capDef(args.device, this.homey, cap);
      return matches(def, args.device.getCapabilityValue(cap), argId(args.value));
    }, { capability: capAC, value: valAC });

    this._reg('action', 'capability_value_set', async (args) => {
      const cap = argId(args.capability);
      const d = args.device;
      if (!d?.hasCapability?.(cap)) {throw this.err('no_capability', { cap });}
      if (!isSetable(d, this.homey, cap)) {throw this.err('not_setable', { cap });}
      const r = coerce(capDef(d, this.homey, cap), cap, argId(args.value));
      if (!r.ok) {throw this.err(r.code, r.params);}
      if (typeof d.triggerCapabilityListener === 'function') {await d.triggerCapabilityListener(cap, r.value);} else {await d.setCapabilityValue(cap, r.value);}
      return true;
    }, { capability: setAC, value: valAC });

    this._argsFor('capability_value_delta');
  }

  onCapabilityChanged(device, deviceId, capability, value, oldValue) {
    try {
      if (value === oldValue) {return;}
      if (!this._wanted('capability_value_delta', deviceId, (a) => argId(a.capability) === capability && deltaPasses(a.min_delta, value, oldValue))) {return;}
      this._fire('capability_value_delta', deltaTokens(capability, value, oldValue), { deviceId, capability, value, old: oldValue });
    } catch (_e) { /* soft */ }
  }
}

module.exports = { CapabilityValueCards, capDef, isSetable, capabilityList, valueList, coerce, matches, deltaTokens, deltaPasses, MSG };
