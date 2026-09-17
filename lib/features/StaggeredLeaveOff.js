'use strict';

/**
 * StaggeredLeaveOff (P2565) — unbranded mesh-friendly leave-home all-off (Lutron/ST feel).
 * Turns lights off with staggered delays to avoid Zigbee storms. MASTER_ONLY.
 * UI: Staggered Leave Off.
 */

class StaggeredLeaveOff {
  /**
   * @param {object} app
   * @param {object[]} lights
   * @param {object} [opts]
   * @returns {{ scheduled: number, staggerMs: number }}
   */
  static run(app, lights = [], opts = {}) {
    const list = (lights || []).filter(Boolean);
    const staggerMs = Math.max(50, Math.min(2000, Number(opts.staggerMs) || 180));
    const homey = app?.homey;
    if (!homey || !list.length) return { scheduled: 0, staggerMs };

    let i = 0;
    for (const light of list) {
      const delay = i * staggerMs;
      i += 1;
      homey.setTimeout(async () => {
        try {
          if (typeof app._hueSetLight === 'function') {
            await app._hueSetLight(light, { onoff: false });
          } else if (light.hasCapability?.('onoff')) {
            const set = light.safeSetCapabilityValue?.bind(light) || light.setCapabilityValue?.bind(light);
            await set?.('onoff', false);
          }
        } catch (_e) { /* soft */ }
      }, delay);
    }
    return { scheduled: list.length, staggerMs };
  }

  /** Collect app lights (class light or onoff+dim). */
  static collectLights(homey, { max = 40 } = {}) {
    const out = [];
    try {
      for (const driver of Object.values(homey?.drivers?.getDrivers?.() || {})) {
        for (const device of driver.getDevices?.() || []) {
          const isLight = device.getClass?.() === 'light'
            || (device.hasCapability?.('dim') && device.hasCapability?.('onoff'));
          if (!isLight) continue;
          out.push(device);
          if (out.length >= max) return out;
        }
      }
    } catch (_e) { /* soft */ }
    return out;
  }
}

module.exports = StaggeredLeaveOff;
