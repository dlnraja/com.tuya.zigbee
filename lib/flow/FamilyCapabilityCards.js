'use strict';

/**
 * P3065 D10 (b) — dedicated, app-level family cards for the custom capabilities that so far only had
 * the generic capability_value_* cards: alarm_human, frost_protection, power_on_behavior.
 * Device filter `capabilities=<cap>`, so each card lists exactly the devices that have it (any driver,
 * also when P3064 adds the capability later). Homey system capabilities are never duplicated here.
 *
 *   alarm_human        trigger human_presence_changed (present/absent/any), condition human_presence_is_detected
 *   frost_protection   trigger frost_protection_changed (on/off/any), condition frost_protection_is_on, action frost_protection_set
 *   power_on_behavior  trigger power_on_behavior_changed (tokens behavior, previous), condition power_on_behavior_is,
 *                      action power_on_behavior_set (value checked against the device's own list)
 *   hvac_system_mode   trigger hvac_system_mode_changed (tokens mode, previous), condition hvac_system_mode_is,
 *                      action hvac_system_mode_set; [[mode]] is an autocomplete fed by the device's own enum
 *                      (capabilitiesOptions values win), so no value list is stored in the manifest (D24)
 *
 * Reuses the P2775 GenericDeviceCards plumbing (_reg, _wanted, _fire, sameDevice) and the P3065 value
 * checks (capDef, coerce). Card model: Homey SDK device-filter and dropdown args; family split inspired by
 * public card lists of other Homey apps (Johan Bendz's Tuya Zigbee app among them), no code copied.
 * Soft: a failure never blocks a capability update; run listeners throw a clear, translated error.
 */

const { GenericDeviceCards, sameDevice } = require('./GenericDeviceCards');
const { capDef, coerce, valueList, MSG } = require('./CapabilityValueCards');

const FAMILIES = [
  { cap: 'alarm_human', type: 'boolean', trigger: 'human_presence_changed', condition: 'human_presence_is_detected', on: 'present', off: 'absent' },
  { cap: 'frost_protection', type: 'boolean', trigger: 'frost_protection_changed', condition: 'frost_protection_is_on', action: 'frost_protection_set', on: 'on', off: 'off' },
  { cap: 'power_on_behavior', type: 'enum', trigger: 'power_on_behavior_changed', condition: 'power_on_behavior_is', action: 'power_on_behavior_set', arg: 'behavior' },
  { cap: 'hvac_system_mode', type: 'enum', trigger: 'hvac_system_mode_changed', condition: 'hvac_system_mode_is', action: 'hvac_system_mode_set', arg: 'mode', token: 'mode', autocomplete: true },
];

function argId(a) { return a && typeof a === 'object' ? a.id : a; }

/** Tokens and trigger state for a family capability change, or null when it is not one. */
function familyEvent(fam, value, oldValue) {
  if (value === oldValue || value === null || value === undefined) {return null;}
  if (fam.type === 'boolean') {
    if (typeof value !== 'boolean') {return null;}
    const state = value ? fam.on : fam.off;
    return { tokens: { state }, state: { state } };
  }
  const v = String(value);
  return { tokens: { [fam.token || 'behavior']: v, previous: oldValue === null || oldValue === undefined ? '' : String(oldValue) }, state: { value: v } };
}

class FamilyCapabilityCards extends GenericDeviceCards {
  err(code, params) {
    const m = MSG[code] || { en: code };
    let s = m[this.lang()] || m.en;
    for (const [k, v] of Object.entries(params || {})) {s = s.split(`{${k}}`).join(String(v));}
    return new Error(s);
  }

  _need(device, cap) {
    if (!device?.hasCapability?.(cap)) {throw this.err('no_capability', { cap });}
    return device;
  }

  async _set(device, cap, value) {
    if (typeof device.triggerCapabilityListener === 'function') {await device.triggerCapabilityListener(cap, value);} else {await device.setCapabilityValue(cap, value);}
    return true;
  }

  register() {
    for (const fam of FAMILIES) {
      const { cap } = fam;
      const ac = fam.autocomplete ? { [fam.arg]: async (q, args) => valueList(args && args.device, this.homey, cap, q, this.lang()) } : {};
      this._reg('trigger', fam.trigger, async (args, state) => sameDevice(args.device, state.deviceId)
        && (fam.type !== 'boolean' || !args.state || args.state === 'any' || args.state === state.state));
      if (fam.type === 'boolean') {
        this._reg('condition', fam.condition, async (args) => this._need(args.device, cap).getCapabilityValue(cap) === true);
      } else {
        this._reg('condition', fam.condition, async (args) => this._need(args.device, cap).getCapabilityValue(cap) === argId(args[fam.arg]), ac);
      }
      if (!fam.action) {continue;}
      if (fam.type === 'boolean') {
        this._reg('action', fam.action, async (args) => this._set(this._need(args.device, cap), cap, args.state === 'on'));
      } else {
        this._reg('action', fam.action, async (args) => {
          const d = this._need(args.device, cap);
          const r = coerce(capDef(d, this.homey, cap), cap, argId(args[fam.arg]));
          if (!r.ok) {throw this.err(r.code, r.params);}
          return this._set(d, cap, r.value);
        }, ac);
      }
    }
    for (const fam of FAMILIES) {this._argsFor(fam.trigger);}
  }

  onCapabilityChanged(device, deviceId, capability, value, oldValue) {
    try {
      const fam = FAMILIES.find((f) => f.cap === capability);
      if (!fam) {return;}
      const ev = familyEvent(fam, value, oldValue);
      if (!ev || !this._wanted(fam.trigger, deviceId)) {return;}
      this._fire(fam.trigger, ev.tokens, { deviceId, capability, ...ev.state });
    } catch (_e) { /* soft */ }
  }
}

module.exports = { FamilyCapabilityCards, FAMILIES, familyEvent };
