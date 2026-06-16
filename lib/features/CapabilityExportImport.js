'use strict';

/**
 * Device Capability Export/Import - FEATURE #50
 *
 * Export and import device capability configurations:
 * - Export device capability profile
 * - Import capability settings between devices
 * - Capability diff/comparison
 *
 * @version 9.1.0
 */

const EventEmitter = require('events');

class CapabilityExportImport extends EventEmitter {
  constructor(homey, options = {}) {
    super();
    this.homey = homey;
  }

  /**
   * Export a device's capability profile
   * @param {string} deviceId
   * @returns {Object} Capability profile
   */
  async exportDeviceCapabilities(deviceId) {
    const device = this.homey.ManagerDevices.getDevice(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const profile = {
      deviceId,
      deviceName: device.getName(),
      driverId: device.driver?.id,
      exportedAt: new Date().toISOString(),
      capabilities: {},
      settings: {},
      storeValues: {}
    };

    // Export capabilities
    for (const cap of (device.capabilities || [])) {
      try {
        const value = device.getCapabilityValue(cap);
        profile.capabilities[cap] = {
          value,
          options: device.getCapabilityOptions ? device.getCapabilityOptions(cap) : {}
        };
      } catch (err) {
        profile.capabilities[cap] = { value: null, error: err.message };
      }
    }

    // Export settings
    if (device.getSettings) {
      profile.settings = device.getSettings();
    }

    // Export store values
    try {
      const storeKeys = device.getStoreKeys ? device.getStoreKeys() : [];
      for (const key of storeKeys) {
        try {
          profile.storeValues[key] = await device.getStoreValue(key);
        } catch (e) {
          // Skip inaccessible store values
        }
      }
    } catch (e) {
      // Ignore
    }

    return profile;
  }

  /**
   * Import capability settings to a device
   * @param {string} deviceId - Target device
   * @param {Object} profile - Exported profile to import from
   * @param {Object} options - { capabilitiesOnly, settingsOnly, dryRun }
   * @returns {Object} Import result
   */
  async importDeviceCapabilities(deviceId, profile, options = {}) {
    const { capabilitiesOnly = false, settingsOnly = false, dryRun = false } = options;

    const device = this.homey.ManagerDevices.getDevice(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const result = {
      deviceId,
      sourceDevice: profile.deviceName,
      dryRun,
      capabilitiesImported: 0,
      settingsImported: 0,
      errors: []
    };

    if (dryRun) {
      // Check compatibility
      const currentCaps = device.capabilities || [];
      for (const cap of Object.keys(profile.capabilities)) {
        if (currentCaps.includes(cap)) {
          result.capabilitiesImported++;
        } else {
          result.errors.push({ capability: cap, reason: 'not_supported' });
        }
      }
      return result;
    }

    // Import capabilities (set values only, don't add new capabilities)
    if (!settingsOnly) {
      for (const [cap, data] of Object.entries(profile.capabilities)) {
        try {
          if (device.hasCapability(cap) && data.value !== null) {
            await device.setCapabilityValue(cap, data.value);
            result.capabilitiesImported++;
          }
        } catch (err) {
          result.errors.push({ capability: cap, error: err.message });
        }
      }
    }

    // Import settings
    if (!capabilitiesOnly && profile.settings) {
      for (const [key, value] of Object.entries(profile.settings)) {
        try {
          if (device.setSetting) {
            await device.setSetting(key, value);
            result.settingsImported++;
          }
        } catch (err) {
          result.errors.push({ setting: key, error: err.message });
        }
      }
    }

    this.emit('capabilitiesImported', result);
    return result;
  }

  /**
   * Compare capability profiles of two devices
   * @param {string} deviceId1
   * @param {string} deviceId2
   * @returns {Object} Diff result
   */
  async compareDevices(deviceId1, deviceId2) {
    const profile1 = await this.exportDeviceCapabilities(deviceId1);
    const profile2 = await this.exportDeviceCapabilities(deviceId2);

    const allCaps = new Set([
      ...Object.keys(profile1.capabilities),
      ...Object.keys(profile2.capabilities)
    ]);

    const diff = {
      common: [],
      onlyInDevice1: [],
      onlyInDevice2: [],
      valueDifferences: []
    };

    for (const cap of allCaps) {
      const in1 = cap in profile1.capabilities;
      const in2 = cap in profile2.capabilities;

      if (in1 && in2) {
        diff.common.push(cap);
        if (profile1.capabilities[cap].value !== profile2.capabilities[cap].value) {
          diff.valueDifferences.push({
            capability: cap,
            device1Value: profile1.capabilities[cap].value,
            device2Value: profile2.capabilities[cap].value
          });
        }
      } else if (in1) {
        diff.onlyInDevice1.push(cap);
      } else {
        diff.onlyInDevice2.push(cap);
      }
    }

    return {
      device1: { id: deviceId1, name: profile1.deviceName },
      device2: { id: deviceId2, name: profile2.deviceName },
      diff
    };
  }

  /**
   * Export all devices' capability profiles
   */
  async exportAllDevices() {
    const devices = this.homey.ManagerDevices.getDevices();
    const profiles = {};

    for (const device of Object.values(devices)) {
      try {
        profiles[device.id] = await this.exportDeviceCapabilities(device.id);
      } catch (err) {
        profiles[device.id] = { error: err.message };
      }
    }

    return {
      exportedAt: new Date().toISOString(),
      deviceCount: Object.keys(profiles).length,
      profiles
    };
  }

  destroy() {}
}

module.exports = CapabilityExportImport;
