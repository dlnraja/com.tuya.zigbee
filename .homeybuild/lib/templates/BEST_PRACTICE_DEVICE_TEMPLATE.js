'use strict';

/**
 * SDK3 Best Practice Device Template
 *
 * This template follows all Athom SDK3 best practices:
 * - CLUSTER constants instead of numeric IDs
 * - reportOpts integrated in registerCapability
 * - triggerFlow() method for flow cards
 * - JSDoc documentation
 * - Error handling
 * - Battery thresholds
 *
 * @see https://apps.developer.homey.app/wireless/zigbee
 * @see https://github.com/athombv/com.ikea.tradfri-example
 */

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class BestPracticeDevice extends ZigBeeDevice {

  /**
   * onNodeInit is called when the device is initialized
   * @param {object} options
   * @param {ZCLNode} options.zclNode - The ZCL node instance
   */
  async onNodeInit({ zclNode }) {

    // Enable debug logging (remove in production)
    // this.enableDebug();
    // this.printNode();

    // Set battery threshold for low battery alarm
    this.batteryThreshold = 20;

    // ========================================
    // BATTERY CAPABILITY - Best Practice
    // ========================================
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',

        // [OK] Best Practice: Get value on device start
        getOpts: {
          getOnStart: true,
          getOnOnline: true,
        },

        // [OK] Best Practice: Integrated reportOpts
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 3600,      // Min 1 hour
            maxInterval: 65535,     // ~18 hours (max uint16 for Zigbee)
            minChange: 1,           // Report when changed by 1%
          },
        },

        // Parser for battery value
        reportParser: value => {
          if (value === null || value === undefined) return null;
          // Convert from 0-200 scale to 0-100%
          const percentage = Math.round(value / 2);
          return Math.max(0, Math.min(100, percentage));
        },

        getParser: value => {
          if (value === null || value === undefined) return null;
          const percentage = Math.round(value / 2);
          return Math.max(0, Math.min(100, percentage));
        },
      });

      this.log('[OK] Battery capability registered');
    }

    // ========================================
    // TEMPERATURE CAPABILITY - Best Practice
    // ========================================
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
        get: 'measuredValue',
        report: 'measuredValue',

        getOpts: {
          getOnStart: true,
        },

        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0,
            maxInterval: 3600,      // Max 1 hour
            minChange: 50,          // 0.5°C (value is in 1/100th)
          },
        },

        reportParser: value => {
          if (value === null || value === undefined) return null;
          return Math.round(value / 100 * 10) / 10; // Convert to °C with 1 decimal
        },

        getParser: value => {
          if (value === null || value === undefined) return null;
          return Math.round(value / 100 * 10) / 10;
        },
      });

      this.log('[OK] Temperature capability registered');
    }

    // ========================================
    // HUMIDITY CAPABILITY - Best Practice
    // ========================================
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT, {
        get: 'measuredValue',
        report: 'measuredValue',

        getOpts: {
          getOnStart: true,
        },

        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0,
            maxInterval: 3600,
            minChange: 100,         // 1% (value is in 1/100th)
          },
        },

        reportParser: value => {
          if (value === null || value === undefined) return null;
          return Math.round(value / 100); // Convert to %
        },

        getParser: value => {
          if (value === null || value === undefined) return null;
          return Math.round(value / 100);
        },
      });

      this.log('[OK] Humidity capability registered');
    }

    // ========================================
    // MOTION ALARM (IAS ZONE) - Best Practice
    // ========================================
    if (this.hasCapability('alarm_motion')) {
      this.registerCapability('alarm_motion', CLUSTER.IAS_ZONE, {
        get: 'zoneStatus',
        report: 'zoneStatus',

        getOpts: {
          getOnStart: true,
        },

        reportParser: value => {
          if (value === null || value === undefined) return null;
          // IAS Zone bit 0 = alarm1 (motion)
          return (value & 0x01) === 0x01;
        },

        getParser: value => {
          if (value === null || value === undefined) return null;
          return (value & 0x01) === 0x01;
        },
      });

      this.log('[OK] Motion alarm capability registered');
    }

    // Set device as available
    await this.setAvailable().catch(err => {
      this.error('Error setting device available:', err);
    });

    this.log('[OK] Device initialized successfully');
  }

  /**
   * onDeleted is called when the device is removed
   */
  async onDeleted() {
    this.log('Device has been deleted');
  }

  // ========================================
  // FLOW CARD METHODS - Best Practice
  // ========================================

  /**
   * Triggers a flow card with optional tokens
   * [OK] Best Practice: Use triggerFlow() method from ZigBeeDevice
   *
   * @param {string} flowId - The flow card ID
   * @param {object} tokens - Token values to pass to the flow
   * @returns {Promise<void>}
   */
  async triggerFlowCard(flowId, tokens = {}) {
    try {
      await this.triggerFlow({ id: flowId, tokens }).catch(err => this.error(err));
      this.log(`[OK] Flow triggered: ${flowId}`, tokens);
    } catch (err) {
      this.error(`[ERROR] Error triggering flow '${flowId}':`, err);
      throw err;
    }
  }

  /**
   * Example: Trigger motion detected flow
   * @private
   */
  async _onMotionDetected() {
    await this.triggerFlowCard('motion_detected', {
      timestamp: new Date().toISOString(),
    }).catch(err => this.error('Motion flow error:', err));
  }

  /**
   * Example: Trigger button pressed flow
   * @param {string} button - Button number
   * @param {string} action - Action type (single, double, long)
   * @private
   */
  async _onButtonPressed(button, action) {
    await this.triggerFlowCard('button_pressed', {
      button: String(button),
      action: action,
    }).catch(err => this.error('Button flow error:', err));
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Safely get capability value with fallback
   * @param {string} capabilityId - Capability ID
   * @param {*} fallback - Fallback value
   * @returns {*} Capability value or fallback
   */
  getCapabilitySafe(capabilityId, fallback = null) {
    try {
      if (this.hasCapability(capabilityId)) {
        const value = this.getCapabilityValue(capabilityId);
        return value !== null && value !== undefined ? value : fallback;
      }
      return fallback;
    } catch (err) {
      this.error(`Error getting capability '${capabilityId}':`, err);
      return fallback;
    }
  }

  /**
   * Safely set capability value with validation
   * @param {string} capabilityId - Capability ID
   * @param {*} value - New value
   * @returns {Promise<void>}
   */
  async setCapabilitySafe(capabilityId, value) {
    try {
      if (this.hasCapability(capabilityId)) {
        await this.setCapabilityValue(capabilityId, value).catch(err => this.error(err));
        this.log(`[OK] Capability '${capabilityId}' set to:`, value);
      } else {
        this.log(`[WARN] Capability '${capabilityId}' not available`);
      }
    } catch (err) {
      this.error(`Error setting capability '${capabilityId}':`, err);
      throw err;
    }
  }
}

module.exports = BestPracticeDevice;

/**
 * USAGE EXAMPLE:
 *
 * // In your driver's device.js:
 * const BestPracticeDevice = require('../../lib/templates/BEST_PRACTICE_DEVICE_TEMPLATE');
 *
 * class MyDevice extends BestPracticeDevice {
 *   async onNodeInit({ zclNode }) {
 *     await super.onNodeInit({ zclNode }).catch(err => this.error(err));
 *
 *     // Add your custom initialization here
 *     this.log('Custom initialization complete');
 *   }
 * }
 *
 * module.exports = MyDevice;
 */
