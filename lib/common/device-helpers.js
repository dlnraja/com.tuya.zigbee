/**
 * Common device helper utilities
 */

class DeviceHelpers {
  /**
   * Get device capability value safely
   */
  static getCapabilityValue(device, capability) {
    try {
      return device.getCapabilityValue(capability);
    } catch (error) {
      return null;
    }
  }

  /**
   * Set device capability value safely
   */
  static async setCapabilityValue(device, capability, value) {
    try {
      await device.setCapabilityValue(capability, value);
      return true;
    } catch (error) {
      device.error(`Failed to set ${capability}:`, error);
      return false;
    }
  }

  /**
   * Check if device has capability
   */
  static hasCapability(device, capability) {
    try {
      return device.hasCapability(capability);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get device settings safely
   */
  static getSetting(device, key, defaultValue = null) {
    try {
      return device.getSetting(key) || defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * Log device info for debugging
   */
  static logDeviceInfo(device) {
    try {
      const info = {
        id: device.getData().id,
        name: device.getName(),
        capabilities: device.getCapabilities(),
        settings: device.getSettings(),
        data: device.getData()
      };
      device.log('Device info:', JSON.stringify(info, null, 2));
    } catch (error) {
      device.error('Failed to log device info:', error);
    }
  }
}

// Runtime FIFO for DP processing and debounced capability updates
const dpQueues = new Map(); // deviceId -> { queue: Array<{dp,raw}>, busy: boolean }
const capDebounces = new Map(); // `${deviceId}:${cap}` -> Timeout

DeviceHelpers.enqueueDp = (device, handler) => (dp, raw) => {
  try {
    const deviceId = device.getId ? device.getId() : device.getData()?.id;
    if (!deviceId) return handler(dp, raw);
    if (!dpQueues.has(deviceId)) dpQueues.set(deviceId, { queue: [], busy: false });
    const state = dpQueues.get(deviceId);
    if (state.queue.length > 100) { device.log('dp-queue-drop', dp); return; }
    state.queue.push({ dp, raw });
    if (!state.busy) processNext();
    function processNext() {
      const item = state.queue.shift();
      if (!item) { state.busy = false; return; }
      state.busy = true;
      Promise.resolve(handler(item.dp, item.raw))
        .catch(err => device.error('dp-handler', err))
        .finally(() => { state.busy = false; if (state.queue.length) processNext(); });
    }
  } catch (e) { device.error('enqueueDp', e); handler(dp, raw); }
};

DeviceHelpers.debounceCapability = (device, capability, ms = 200) => value => {
  try {
    const deviceId = device.getId ? device.getId() : device.getData()?.id;
    const key = `${deviceId}:${capability}`;
    const prev = capDebounces.get(key);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => {
      device.setCapabilityValue(capability, value).catch(device.error);
    }, ms);
    capDebounces.set(key, t);
  } catch (e) { device.error('debounceCapability', e); }
};

module.exports = DeviceHelpers;
