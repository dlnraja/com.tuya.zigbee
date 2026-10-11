'use strict';

/**
 * FeatureFallbackRouter — v9.0.407 (P92.109)
 *
 * Principle requested by the maintainer: EVERY native feature/flow must have
 * a software fallback when the device does not support the native path, so
 * the feature works on ALL drivers.
 *
 * Resolution order for each feature:
 *   1. Native ZCL cluster (standard Zigbee)
 *   2. Tuya DP datapoint (proprietary Tuya)
 *   3. Software emulation (always available, state-safe)
 *
 * Currently routed features:
 *   - blink/alert  : ZCL Identify → Tuya DP identify → on/off pulses (restore)
 *   - smoothDim    : ZCL LevelControl moveToLevelWithOnOff+transition → Tuya DP
 *                    dimmer set → software ramp (TransitionEngine-style steps)
 *   - countdown    : Tuya DP countdown → software auto-off timer
 *
 * All timers use the Rule-28 fallback (homey?.setTimeout || globalThis).
 */

class FeatureFallbackRouter {

  constructor(homey, options = {}) {
    this.homey = homey;
    this._log = options.logger || (() => {});
  }

  _scheduler() {
    return (this.homey && typeof this.homey.setTimeout === 'function') ? this.homey : globalThis;
  }

  async _setCap(device, cap, value) {
    if (typeof device.setCapabilityValue === 'function') {
      await device.setCapabilityValue(cap, value).catch(() => {});
    }
  }

  async _sendDP(device, dp, value, type = 'value') {
    if (typeof device._sendTuyaDP === 'function') {
      await device._sendTuyaDP(dp, value, type);
      return true;
    }
    if (typeof device.sendDP === 'function') {
      await device.sendDP(dp, value, type);
      return true;
    }
    return false;
  }

  /**
   * Blink a device for N seconds.
   * Native: ZCL Identify (cluster 3). Fallback: on/off pulses with state restore.
   */
  async blink(device, seconds = 10) {
    seconds = Math.max(1, Math.min(300, Math.round(seconds)));
    // 1. Native ZCL Identify
    try {
      const identifyCluster = device.zclNode?.endpoints?.[1]?.clusters?.identify;
      if (identifyCluster && typeof identifyCluster.identify === 'function') {
        await identifyCluster.identify({ identifyTime: seconds });
        this._log(`[FALLBACK] blink via ZCL Identify (${seconds}s)`);
        return { ok: true, path: 'zcl_identify' };
      }
    } catch (e) {
      this._log(`[FALLBACK] identify cluster failed: ${e.message}`);
    }
    // 2. Software pulses with state restore
    if (typeof device.setCapabilityValue === 'function' && device.hasCapability?.('onoff')) {
      const original = device.getCapabilityValue?.('onoff') === true;
      const pulses = Math.max(2, Math.min(10, Math.round(seconds / 2)));
      const scheduler = this._scheduler();
      for (let i = 0; i < pulses; i++) {
        await this._setCap(device, 'onoff', i % 2 === 0 ? !original : original);
        await new Promise((r) => scheduler.setTimeout(r, 500));
      }
      await this._setCap(device, 'onoff', original);
      this._log(`[FALLBACK] blink via ${pulses} software pulses (state restored)`);
      return { ok: true, path: 'software_pulses' };
    }
    return { ok: false, reason: 'no_onoff_capability' };
  }

  /**
   * Smoothly set brightness to target (0-100) over durationMs.
   * Native: ZCL moveToLevelWithOnOff w/ transition → Tuya DP dim → software ramp.
   */
  async smoothDim(device, targetPercent, durationMs = 2000) {
    targetPercent = Math.max(0, Math.min(100, Math.round(targetPercent)));
    durationMs = Math.max(0, Math.min(60000, Math.round(durationMs)));
    // 1. Native ZCL LevelControl with transition time (units of 1/10s)
    try {
      const levelCluster = device.zclNode?.endpoints?.[1]?.clusters?.levelControl;
      if (levelCluster && typeof levelCluster.moveToLevelWithOnOff === 'function') {
        const level = Math.round((targetPercent / 100) * 254);
        await levelCluster.moveToLevelWithOnOff({ level, transitionTime: Math.round(durationMs / 100) });
        this._log(`[FALLBACK] smoothDim via ZCL transition (${targetPercent}% in ${durationMs}ms)`);
        return { ok: true, path: 'zcl_transition' };
      }
    } catch (e) {
      this._log(`[FALLBACK] levelControl transition failed: ${e.message}`);
    }
    // 2. Tuya DP dimmer (DP2 value 0-1000)
    if (await this._sendDP(device, 2, Math.round(targetPercent * 10), 'value').catch(() => false)) {
      this._log(`[FALLBACK] smoothDim via Tuya DP2 (${targetPercent}%)`);
      return { ok: true, path: 'tuya_dp' };
    }
    // 3. Software ramp on `dim` capability
    if (device.hasCapability?.('dim')) {
      const start = (device.getCapabilityValue?.('dim') ?? 0) * 100;
      const steps = Math.max(2, Math.min(30, Math.round(durationMs / 200)));
      const stepMs = durationMs / steps;
      const scheduler = this._scheduler();
      for (let i = 1; i <= steps; i++) {
        const v = Math.round((start + ((targetPercent - start) * i) / steps)) / 100;
        await this._setCap(device, 'dim', v);
        if (i < steps) { await new Promise((r) => scheduler.setTimeout(r, stepMs)); }
      }
      this._log(`[FALLBACK] smoothDim via ${steps} software steps (${targetPercent}%)`);
      return { ok: true, path: 'software_ramp' };
    }
    return { ok: false, reason: 'no_dim_path' };
  }

  /**
   * Countdown: turn device off after N seconds.
   * Native: Tuya countdown DP (DP7 gang1 by default). Fallback: software timer.
   */
  async countdown(device, seconds, gang = 1) {
    seconds = Math.max(1, Math.min(86400, Math.round(seconds)));
    // 1. Tuya DP countdown (gang→DP mapping per Z2M)
    const dpMap = { 1: 7, 2: 8, 3: 9, 4: 10 };
    if (await this._sendDP(device, dpMap[gang] || 7, seconds, 'value').catch(() => false)) {
      this._log(`[FALLBACK] countdown via Tuya DP${dpMap[gang] || 7} (${seconds}s)`);
      return { ok: true, path: 'tuya_dp' };
    }
    // 2. Software auto-off timer
    if (device.hasCapability?.('onoff')) {
      const scheduler = this._scheduler();
      const key = `cd_${device.id || 'x'}_${gang}`;
      if (!this._cdTimers) { this._cdTimers = new Map(); }
      if (this._cdTimers.has(key)) { clearTimeout(this._cdTimers.get(key)); }
      this._cdTimers.set(key, scheduler.setTimeout(() => {
        this._cdTimers.delete(key);
        this._setCap(device, 'onoff', false);
        this._log(`[FALLBACK] countdown software: OFF after ${seconds}s`);
      }, seconds * 1000));
      this._log(`[FALLBACK] countdown via software timer (${seconds}s)`);
      return { ok: true, path: 'software_timer' };
    }
    return { ok: false, reason: 'no_onoff_capability' };
  }
}

module.exports = FeatureFallbackRouter;
