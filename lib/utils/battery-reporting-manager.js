'use strict';

/**
 * Battery Reporting Manager
 * Handles automatic battery attribute reporting configuration
 * Based on Athom best practices and Homey SDK3 standards
 *
 * @description Configures genPowerCfg cluster reporting for battery-powered devices
 * @author Universal Tuya Zigbee Team
 * @version 1.0.0
 */

class BatteryReportingManager {
  /**
   * Creates a Battery Reporting Manager instance
   * @param {ZigBeeDevice} device - The Zigbee device instance
   */
  constructor(device) {
    this.device = device;
    this.configured = false;
    this.listenerRegistered = false;
  }

  /**
   * Configure battery reporting for device
   * @param {ZCLNode} zclNode - Zigbee node instance
   * @param {number} endpoint - Endpoint number (default: 1)
   * @returns {Promise<boolean>} - Success status
   */
  async configure(zclNode, endpoint = 1) {
    try {
      const ep = zclNode.endpoints[endpoint];

      // Validate cluster availability
      if (!ep || !ep.clusters || !ep.clusters.genPowerCfg) {
        this.device.log('[BATTERY-REPORTING] genPowerCfg cluster not available on endpoint', endpoint);
        return false;
      }

      this.device.log('[BATTERY-REPORTING] Configuring attribute reporting...');

      // Configure reporting for batteryPercentageRemaining
      // Zigbee scale: 0-200 (0-100% with 0.5% resolution)
      await ep.clusters.genPowerCfg.configureReporting({
        batteryPercentageRemaining: {
          minInterval: 3600,      // 1 hour minimum (save battery)
          maxInterval: 43200,     // 12 hours maximum
          minChange: 5,           // 2.5% change (value/2)
        },
      });

      this.device.log('[BATTERY-REPORTING] ✅ Attribute reporting configured successfully');
      this.configured = true;
      return true;

    } catch (err) {
      this.device.error('[BATTERY-REPORTING] Failed to configure reporting:', err.message);
      return false;
    }
  }

  /**
   * Setup listener for battery attribute reports
   * @param {ZCLNode} zclNode - Zigbee node instance
   * @param {number} endpoint - Endpoint number (default: 1)
   */
  setupListener(zclNode, endpoint = 1) {
    try {
      const ep = zclNode.endpoints[endpoint];

      // Validate cluster availability
      if (!ep || !ep.clusters || !ep.clusters.genPowerCfg) {
        this.device.log('[BATTERY-REPORTING] Cannot setup listener - genPowerCfg cluster not available');
        return;
      }

      // Register attribute listener
      ep.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', (value) => {
        // Convert Zigbee scale (0-200) to percentage (0-100)
        const percent = Math.min(100, Math.max(0, value / 2));

        this.device.log(`[BATTERY-REPORTING] 📊 Report received: ${percent}% (raw: ${value})`);

        // Update capability if device supports it
        if (this.device.hasCapability('measure_battery')) {
          this.device.setCapabilityValue('measure_battery', percent)
            .catch(err => this.device.error('[BATTERY-REPORTING] Failed to update capability:', err));
        }
      });

      this.device.log('[BATTERY-REPORTING] ✅ Listener registered for batteryPercentageRemaining');
      this.listenerRegistered = true;

    } catch (err) {
      this.device.error('[BATTERY-REPORTING] Failed to setup listener:', err.message);
    }
  }

  /**
   * Read initial battery value
   * @param {ZCLNode} zclNode - Zigbee node instance
   * @param {number} endpoint - Endpoint number (default: 1)
   * @returns {Promise<number|null>} - Battery percentage or null
   */
  async readInitial(zclNode, endpoint = 1) {
    try {
      const ep = zclNode.endpoints[endpoint];

      // Validate cluster availability
      if (!ep || !ep.clusters || !ep.clusters.genPowerCfg) {
        this.device.log('[BATTERY-REPORTING] Cannot read initial - genPowerCfg cluster not available');
        return null;
      }

      // Read battery percentage attribute
      const battery = await ep.clusters.genPowerCfg.readAttributes(['batteryPercentageRemaining']);

      if (battery && battery.batteryPercentageRemaining !== undefined) {
        // Convert Zigbee scale (0-200) to percentage (0-100)
        const percent = Math.min(100, Math.max(0, battery.batteryPercentageRemaining / 2));

        this.device.log(`[BATTERY-REPORTING] 📖 Initial read: ${percent}% (raw: ${battery.batteryPercentageRemaining})`);

        // Update capability if device supports it
        if (this.device.hasCapability('measure_battery')) {
          await this.device.setCapabilityValue('measure_battery', percent);
        }

        return percent;
      }

      return null;

    } catch (err) {
      this.device.error('[BATTERY-REPORTING] Failed to read initial battery:', err.message);
      return null;
    }
  }

  /**
   * Initialize complete battery reporting
   * This is the main method to call during device initialization
   * @param {ZCLNode} zclNode - Zigbee node instance
   * @param {number} endpoint - Endpoint number (default: 1)
   */
  async initialize(zclNode, endpoint = 1) {
    this.device.log('[BATTERY-REPORTING] Initializing battery reporting system...');

    try {
      // 1. Configure reporting
      const configSuccess = await this.configure(zclNode, endpoint);

      // 2. Setup listener (even if configure failed, listener might still work)
      this.setupListener(zclNode, endpoint);

      // 3. Read initial value
      await this.readInitial(zclNode, endpoint);

      if (configSuccess && this.listenerRegistered) {
        this.device.log('[BATTERY-REPORTING] ✅ Initialization complete - Full reporting active');
      } else if (this.listenerRegistered) {
        this.device.log('[BATTERY-REPORTING] ⚠️ Initialization partial - Listener active, configure failed');
      } else {
        this.device.log('[BATTERY-REPORTING] ❌ Initialization failed - Falling back to polling');
      }

    } catch (err) {
      this.device.error('[BATTERY-REPORTING] Initialization error:', err.message);
    }
  }

  /**
   * Check if battery reporting is fully configured
   * @returns {boolean} - True if configured and listener is active
   */
  isActive() {
    return this.configured && this.listenerRegistered;
  }

  /**
   * Manual battery poll (fallback method)
   * Use only if automatic reporting failed
   * @param {ZCLNode} zclNode - Zigbee node instance
   * @param {number} endpoint - Endpoint number (default: 1)
   * @returns {Promise<number|null>} - Battery percentage or null
   */
  async poll(zclNode, endpoint = 1) {
    this.device.log('[BATTERY-REPORTING] Manual poll requested');
    return await this.readInitial(zclNode, endpoint);
  }
}

module.exports = BatteryReportingManager;
