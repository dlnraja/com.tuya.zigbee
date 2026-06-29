'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * BaseZigBeeDriver - Base driver for ALL Tuya Zigbee drivers
 *
 * v5.3.63: CRITICAL FIX - Prevents sub-device creation for ALL drivers!
 *
 * Sub-devices are only needed for multi-gang switches (2-gang, 3-gang, etc.)
 * For single-endpoint devices (sensors, plugs, bulbs), sub-devices cause duplicates.
 */
class BaseZigBeeDriver extends ZigBeeDriver {

  /**
   * Override to filter out sub-devices during pairing
   * This prevents phantom device creation for single-endpoint devices
   */
  async onPairListDevices(devices) {
    const driverManifest = this.manifest || {};
    const driverName = driverManifest.name?.en || this.id || 'unknown';

    this.log(`[PAIR] ${driverName}: Raw devices from Zigbee:`, devices?.length || 0);

    if (!devices || devices.length === 0) {
      return devices;
    }

    // Check if this driver should allow sub-devices (multi-gang switches)
    const allowSubDevices = this._shouldAllowSubDevices();

    if (allowSubDevices) {
      this.log(`[PAIR] ${driverName}: Multi-gang driver - allowing sub-devices`);
      return devices;
    }

    // Filter out sub-devices - keep only the main device per IEEE address
    const seenIeeeAddresses = new Set();
    const filteredDevices = [];

    for (const device of devices) {
      const ieee = device.settings?.zb_ieee_address ||
        device.data?.ieeeAddress ||
        device.data?.token;

      // Skip if we've already seen this IEEE address
      if (ieee && seenIeeeAddresses.has(ieee)) {
        this.log(`[PAIR] 🚫 Skipping duplicate device for IEEE ${ieee}`);
        continue;
      }

      // Remove subDeviceId if present
      if (device.data?.subDeviceId !== undefined) {
        this.log(`[PAIR] 🚫 Removing subDeviceId ${device.data.subDeviceId} from device`);
        delete device.data.subDeviceId;
      }

      if (ieee) {
        seenIeeeAddresses.add(ieee);
      }

      filteredDevices.push(device);
      this.log(`[PAIR] ✅ Added device: ${device.name || driverName} (IEEE: ${ieee || 'unknown'})`);
    }

    this.log(`[PAIR] Filtered: ${devices.length} → ${filteredDevices.length} devices`);
    return filteredDevices;
  }

  /**
   * Determine if this driver should allow sub-devices
   * Override in specific drivers if needed
   */
  _shouldAllowSubDevices() {
    const driverManifest = this.manifest || {};
    const driverId = this.id || driverManifest.id || '';

    // Multi-gang switches need sub-devices
    const multiGangPatterns = [
      'switch_2gang',
      'switch_3gang',
      'switch_4gang',
      'switch_6gang',
      'usb_outlet_2port',
      'usb_outlet_3gang',
      'multi_socket',
      'power_strip'
    ];

    for (const pattern of multiGangPatterns) {
      if (driverId.includes(pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Defensive override to prevent "could not get device by ID" crashes
   * especially during deserialization or pairing of sub-devices.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  /**
   * Safe Flow Card Getter.
   * Prefer SDK3 device cards for driver-scoped triggers and fall back to app cards.
   */
  _getFlowCard(id, type = 'trigger') {
    if (!global._registeredFlowCardListeners) {
      global._registeredFlowCardListeners = new Set();
    }
    if (global._registeredFlowCardListeners.has(id)) {
      return null;
    }

    const methods = type === 'trigger'
      ? ['getDeviceTriggerCard', 'getTriggerCard']
      : type === 'action'
        ? ['getDeviceActionCard', 'getActionCard']
        : ['getDeviceConditionCard', 'getConditionCard'];

    for (const method of methods) {
      try {
        if (typeof this.homey?.flow?.[method] !== 'function') {
          continue;
        }
        const card = this.homey.flow[method](id);
        if (!card) {
          continue;
        }
        if (typeof card.registerRunListener === 'function') {
          const originalRegister = card.registerRunListener.bind(card);
          card.registerRunListener = (handler) => {
            if (global._registeredFlowCardListeners.has(id)) return card;
            global._registeredFlowCardListeners.add(id);
            return originalRegister(handler);
          };
        }
        return card;
      } catch (err) {
        // Try the next SDK3/legacy getter.
      }
    }

    return null;
  }
}

module.exports = BaseZigBeeDriver;
