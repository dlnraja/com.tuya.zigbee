'use strict';

/**
 * SDK3BestPractices - v5.5.453
 *
 * Utility class implementing Homey SDK3 best practices from official documentation:
 * https://apps.developer.homey.app/
 *
 * KEY RULES IMPLEMENTED:
 * 1. Never use both alarm_battery AND measure_battery (creates duplicate UI)
 * 2. Battery devices must specify energy.batteries array
 * 3. Flow Device Trigger cards for device-specific triggers
 * 4. IAS Zone enrollment handling
 * 5. Dynamic capability management
 * 6. Sub-capabilities for multi-endpoint devices
 */
class SDK3BestPractices {

  /**
   * Ensure device follows SDK3 battery best practices
   * Rule: Never use both alarm_battery AND measure_battery together
   *
   * @param {Device} device - Homey device instance
   * @returns {Promise<void>}
   */
  static async ensureBatteryBestPractices(device) {
    const hasAlarmBattery = device.hasCapability('alarm_battery');
    const hasMeasureBattery = device.hasCapability('measure_battery');

    if (hasAlarmBattery && hasMeasureBattery) {
      device.log('[SDK3] ⚠️ VIOLATION: Both alarm_battery and measure_battery present!');
      device.log('[SDK3] 📚 Rule: "Never give your driver both capabilities"');
      device.log('[SDK3] 🔧 Removing alarm_battery, keeping measure_battery (more informative)');

      try {
        await device.removeCapability('alarm_battery');
        device.log('[SDK3] ✅ Removed alarm_battery capability');
      } catch (err) {
        device.error('[SDK3] ❌ Failed to remove alarm_battery:', err.message);
      }
    }
  }

  /**
   * Register Flow Device Trigger card for button press events
   * SDK3 Rule: Use getDeviceTriggerCard() for device-specific triggers
   *
   * @param {Device} device - Homey device instance
   * @param {string} cardId - Flow card ID
   * @param {object} tokens - Token data to pass
   * @returns {Promise<void>}
   */
  static async triggerDeviceFlowCard(device, cardId, tokens = {}) {
    try {
      const card = device.homey.flow.getDeviceTriggerCard(cardId);
      if (card) {
        await card.trigger(device, tokens);
        device.log(`[SDK3-FLOW] ✅ Triggered: ${cardId}`, tokens);
      } else {
        device.log(`[SDK3-FLOW] ⚠️ Card not found: ${cardId}`);
      }
    } catch (err) {
      device.log(`[SDK3-FLOW] ❌ Trigger error: ${err.message}`);
    }
  }

  /**
   * Setup IAS Zone enrollment per SDK3 specification
   * Rule: Send Zone Enroll Response at init, not just on request
   *
   * @param {Device} device - Homey device instance
   * @param {object} zclNode - ZCL node instance
   * @param {number} endpointId - Endpoint ID (default 1)
   * @returns {Promise<boolean>}
   */
  static async setupIASZoneEnrollment(device, zclNode, endpointId = 1) {
    try {
      const iasZoneCluster = zclNode.endpoints[endpointId]?.clusters?.iasZone
        || zclNode.endpoints[endpointId]?.clusters?.ssIasZone
        || zclNode.endpoints[endpointId]?.clusters?.[1280];

      if (!iasZoneCluster) {
        device.log('[SDK3-IAS] ℹ️ No IAS Zone cluster on endpoint', endpointId);
        return false;
      }

      device.log('[SDK3-IAS] 🔐 Setting up IAS Zone enrollment...');

      // Listen for Zone Enroll Requests
      if (typeof iasZoneCluster.onZoneEnrollRequest === 'function') {
        iasZoneCluster.onZoneEnrollRequest = async () => {
          device.log('[SDK3-IAS] 📩 Zone Enroll Request received');
          return { enrollResponseCode: 0, zoneId: 0 }; // Success
        };
        device.log('[SDK3-IAS] ✅ Zone Enroll Request handler registered');
      }

      // SDK3 Best Practice: Send Zone Enroll Response at init
      // "the driver could send a Zone Enroll Response when initializing
      // regardless of having received the Zone Enroll Request"
      if (typeof iasZoneCluster.zoneEnrollResponse === 'function') {
        try {
          await iasZoneCluster.zoneEnrollResponse({ enrollResponseCode: 0, zoneId: 0 });
          device.log('[SDK3-IAS] ✅ Proactive Zone Enroll Response sent');
        } catch (err) {
          // May fail if already enrolled - that's OK
          device.log('[SDK3-IAS] ℹ️ Zone Enroll Response:', err.message);
        }
      }

      // Listen for Zone Status Change Notifications
      if (typeof iasZoneCluster.onZoneStatusChangeNotification === 'function') {
        iasZoneCluster.onZoneStatusChangeNotification = (payload) => {
          device.log('[SDK3-IAS] 🚨 Zone Status Change:', payload);
          device.emit('iasZoneStatusChange', payload);
        };
        device.log('[SDK3-IAS] ✅ Zone Status handler registered');
      }

      return true;
    } catch (err) {
      device.error('[SDK3-IAS] ❌ Setup error:', err.message);
      return false;
    }
  }

  /**
   * Dynamically add/remove capabilities following SDK3 rules
   * Note: "This is an expensive method so use it only when needed"
   *
   * @param {Device} device - Homey device instance
   * @param {string[]} required - Required capabilities
   * @param {string[]} forbidden - Forbidden capabilities to remove
   * @returns {Promise<{added: number, removed: number}>}
   */
  static async ensureCapabilities(device, required = [], forbidden = []) {
    let added = 0;
    let removed = 0;

    // Add missing required capabilities
    for (const cap of required) {
      if (!device.hasCapability(cap)) {
        try {
          await device.addCapability(cap);
          device.log(`[SDK3-CAP] ➕ Added: ${cap}`);
          added++;
        } catch (err) {
          device.error(`[SDK3-CAP] ❌ Failed to add ${cap}:`, err.message);
        }
      }
    }

    // Remove forbidden capabilities
    for (const cap of forbidden) {
      if (device.hasCapability(cap)) {
        try {
          await device.removeCapability(cap);
          device.log(`[SDK3-CAP] ➖ Removed: ${cap}`);
          removed++;
        } catch (err) {
          device.error(`[SDK3-CAP] ❌ Failed to remove ${cap}:`, err.message);
        }
      }
    }

    if (added > 0 || removed > 0) {
      device.log(`[SDK3-CAP] 📊 Summary: +${added} added, -${removed} removed`);
    }

    return { added, removed };
  }

  /**
   * Set capability options dynamically
   * Note: "This is an expensive method so use it only when needed"
   *
   * @param {Device} device - Homey device instance
   * @param {string} capabilityId - Capability ID
   * @param {object} options - Options to set
   * @returns {Promise<void>}
   */
  static async setCapabilityOptions(device, capabilityId, options) {
    if (!device.hasCapability(capabilityId)) {
      device.log(`[SDK3-OPT] ⚠️ Capability ${capabilityId} not found`);
      return;
    }

    try {
      await device.setCapabilityOptions(capabilityId, options);
      device.log(`[SDK3-OPT] ✅ Set options for ${capabilityId}:`, options);
    } catch (err) {
      device.error(`[SDK3-OPT] ❌ Failed to set options:`, err.message);
    }
  }

  /**
   * Get sub-device ID for multi-endpoint devices
   * SDK3: "subDeviceId will be added to the device data object"
   *
   * @param {Device} device - Homey device instance
   * @returns {string|null}
   */
  static getSubDeviceId(device) {
    return device.getData()?.subDeviceId || null;
  }

  /**
   * Check if this is the first initialization (after pairing)
   * SDK3: Use isFirstInit() for one-time setup
   *
   * @param {Device} device - Homey device instance
   * @returns {boolean}
   */
  static isFirstInit(device) {
    // homey-zigbeedriver provides this method
    if (typeof device.isFirstInit === 'function') {
      return device.isFirstInit();
    }
    return false;
  }

  /**
   * Set device last seen timestamp
   * SDK3: "setLastSeenAt should be called if the device is known to be alive"
   * Available since Homey v12.6.1
   *
   * @param {Device} device - Homey device instance
   * @returns {Promise<void>}
   */
  static async setLastSeenAt(device) {
    try {
      if (typeof device.setLastSeenAt === 'function') {
        await device.setLastSeenAt();
        // Don't log this - it's called frequently
      }
    } catch (err) {
      // Silently fail - may not be supported on older Homey versions
    }
  }

  /**
   * Apply all SDK3 best practices to a device
   * Call this at the end of onNodeInit()
   *
   * @param {Device} device - Homey device instance
   * @param {object} zclNode - ZCL node instance
   * @param {object} options - Configuration options
   * @returns {Promise<void>}
   */
  static async applyAllBestPractices(device, zclNode, options = {}) {
    device.log('[SDK3] 🚀 Applying SDK3 best practices...');

    // 1. Battery best practices
    await this.ensureBatteryBestPractices(device);

    // 2. IAS Zone enrollment if applicable
    if (options.hasIASZone !== false) {
      await this.setupIASZoneEnrollment(device, zclNode, options.iasEndpoint || 1);
    }

    // 3. Set last seen timestamp
    await this.setLastSeenAt(device);

    device.log('[SDK3] ✅ SDK3 best practices applied');
  }
}

module.exports = SDK3BestPractices;
