'use strict';

/**
 * P3065 D11 (t576u) — Flow cards for adaptive lighting (Solar Sync / Daylight Atmosphere curve), per device.
 *
 *   action    adaptive_lighting_set        turn adaptive lighting on/off for [[device]]
 *   action    adaptive_lighting_pause      pause it for N minutes, then it resumes by itself
 *   condition adaptive_lighting_is_active  adaptive lighting !{{is|is not}} active on [[device]]
 *   trigger   adaptive_kelvin_changed      the curve picked a new white temperature (tokens kelvin, previous_kelvin)
 *
 * Generic and brand-free: device filter `capabilities=light_temperature`, works for any driver and
 * any white-label bulb, all local (sun position computed on Homey, no bridge or cloud).
 * Contract with the device side (notebook 2026-10-26): `device.adaptiveLighting` exposes start(), stop(),
 * `.active`; the manager calls `homey.app.featureFlowCards.triggerAdaptiveKelvin(device, kelvin)` after
 * each computed curve. A device without a built-in manager gets one from these cards on first use; its
 * light writes then go through the capability listener so the value reaches the lamp. Card model follows
 * the Homey SDK docs; the idea of pausing adaptive lighting is common to Home Assistant's community
 * adaptive-lighting integration and Hue apps, reimplemented here in our own code.
 */

const { GenericDeviceCards, sameDevice } = require('./GenericDeviceCards');
const { MSG } = require('./CapabilityValueCards');

const CAP = 'light_temperature';
const PAUSE_MAX_MIN = 1440;

function idOf(device) {
  try { return device?.getData?.()?.id || device?.id || null; } catch (_e) { return null; }
}

/** Device view whose capability writes drive the hardware (listener first, plain set as fallback). */
function drivingView(device) {
  const drive = async (cap, value) => {
    try {
      if (typeof device.triggerCapabilityListener === 'function') {return await device.triggerCapabilityListener(cap, value);}
    } catch (_e) { /* no listener: fall back to a plain set */ }
    return device.setCapabilityValue(cap, value);
  };
  return new Proxy(device, {
    get(target, prop) {
      if (prop === 'setCapabilityValue' || prop === 'safeSetCapabilityValue') {return drive;}
      const v = target[prop];
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}

class AdaptiveLightingCards extends GenericDeviceCards {
  constructor(host) {
    super(host);
    this._pauses = new Map(); // deviceId -> timer
    this._lastKelvin = new Map(); // deviceId -> kelvin
  }

  err(code, params) {
    const m = MSG[code] || { en: code };
    let s = m[this.lang()] || m.en;
    for (const [k, v] of Object.entries(params || {})) {s = s.split(`{${k}}`).join(String(v));}
    return new Error(s);
  }

  _need(device) {
    if (!device?.hasCapability?.(CAP) && !device?.adaptiveLighting) {throw this.err('no_capability', { cap: CAP });}
    return device;
  }

  /** Existing manager, or a new one for this device (made once, torn down with the device). */
  _manager(device, create) {
    if (device.adaptiveLighting) {return device.adaptiveLighting;}
    if (!create) {return null;}
    const Manager = require('../managers/AdaptiveLightingManager');
    const mgr = new Manager(drivingView(device));
    device.adaptiveLighting = mgr;
    const id = idOf(device);
    for (const m of ['onDeleted', 'onUninit']) {
      const orig = device[m];
      device[m] = async function teardown(...a) {
        try { mgr._destroyed = true; mgr.stop(); } catch (_e) { /* soft */ }
        return typeof orig === 'function' ? orig.apply(this, a) : undefined;
      };
    }
    mgr.__flowCreated = id;
    return mgr;
  }

  _clearPause(deviceId) {
    const h = this._pauses.get(deviceId);
    if (h) {try { (this.homey.clearTimeout || clearTimeout)(h); } catch (_e) { /* soft */ }}
    this._pauses.delete(deviceId);
  }

  /**
   * P3065 D14: the shared app engine (P3067 AdaptiveLightingEngine, one 60 s tick for all lights)
   * owns a light when the driver has its `adaptive_lighting` setting; the per-device manager is
   * only the fallback for lights without it. Never both writing.
   */
  _engineFor(device) {
    try {
      const eng = this.homey?.app?.adaptiveLightingEngine;
      if (!eng || typeof eng.pause !== 'function') {return null;}
      const v = device?.getSetting?.('adaptive_lighting');
      return v === true || v === false ? eng : null;
    } catch (_e) { return null; }
  }

  /** Stop a manager this module created so the engine is the only writer. */
  _retireFlowManager(device) {
    const mgr = device?.adaptiveLighting;
    if (mgr && mgr.__flowCreated) {try { mgr.stop(); } catch (_e) { /* soft */ }}
  }

  async setEnabled(device, on) {
    const d = this._need(device);
    this._clearPause(idOf(d));
    const eng = this._engineFor(d);
    if (eng) {
      this._retireFlowManager(d);
      if (d.getSetting('adaptive_lighting') !== on && typeof d.setSettings === 'function') {await d.setSettings({ adaptive_lighting: on });}
      if (on) {eng.resume(d);}
      return true;
    }
    const mgr = this._manager(d, on);
    if (!mgr) {return true;}
    if (on) {mgr.start();} else {mgr.stop();}
    return true;
  }

  async pause(device, minutes) {
    const d = this._need(device);
    const m = Number(minutes);
    if (!Number.isFinite(m) || m <= 0 || m > PAUSE_MAX_MIN) {throw this.err('out_of_range', { cap: 'minutes', value: minutes, min: 1, max: PAUSE_MAX_MIN });}
    const mgr = this._manager(d, false);
    const eng = this._engineFor(d);
    if (eng && !(mgr && mgr.active)) { eng.pause(d, m); return true; }
    if (!mgr || !mgr.active) {return true;} // nothing running: nothing to pause
    const id = idOf(d);
    this._clearPause(id);
    mgr.stop();
    const h = (this.homey.setTimeout || setTimeout)(() => {
      this._pauses.delete(id);
      if (!mgr._destroyed) {mgr.start();}
    }, Math.round(m * 60000));
    this._pauses.set(id, h);
    return true;
  }

  isActive(device) {
    const d = this._need(device);
    const mgr = this._manager(d, false);
    if (mgr && mgr.active) {return true;}
    const eng = this._engineFor(d);
    return !!(eng && eng.isActiveFor(d));
  }

  register() {
    this._reg('action', 'adaptive_lighting_set', async (args) => this.setEnabled(args.device, args.state !== 'off'));
    this._reg('action', 'adaptive_lighting_pause', async (args) => this.pause(args.device, args.minutes));
    this._reg('condition', 'adaptive_lighting_is_active', async (args) => this.isActive(args.device));
    this._reg('trigger', 'adaptive_kelvin_changed', async (args, state) => sameDevice(args.device, state.deviceId));
    this._argsFor('adaptive_kelvin_changed');
  }

  /** Called by the adaptive-lighting manager after each computed curve. */
  onKelvin(device, kelvin) {
    try {
      const k = Math.round(Number(kelvin));
      const id = idOf(device);
      if (!id || !Number.isFinite(k) || k <= 0) {return;}
      const prev = this._lastKelvin.get(id);
      if (prev === k) {return;}
      this._lastKelvin.set(id, k);
      if (this._lastKelvin.size > 512) {this._lastKelvin.delete(this._lastKelvin.keys().next().value);}
      if (!this._wanted('adaptive_kelvin_changed', id)) {return;}
      this._fire('adaptive_kelvin_changed', { kelvin: k, previous_kelvin: prev ?? 0 }, { deviceId: id });
    } catch (_e) { /* soft */ }
  }
}

module.exports = { AdaptiveLightingCards, drivingView, PAUSE_MAX_MIN };
