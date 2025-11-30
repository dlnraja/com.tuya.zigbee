'use strict';

/**
 * Battery Reporting Manager - HYBRID VERSION
 * Handles automatic battery reporting for BOTH:
 * - Standard Zigbee devices (genPowerCfg cluster)
 * - Tuya TS0601 devices (Tuya DP protocol)
 *
 * Based on Athom best practices and Homey SDK3 standards
 *
 * @description Auto-detects device type and uses appropriate battery reporting method
 * @author Universal Tuya Zigbee Team
 * @version 2.0.0 - HYBRID (Standard + Tuya DP)
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
    this.isTuyaDevice = false;
    this.deviceType = 'unknown'; // 'standard', 'tuya_dp', 'unknown'
  }

  /**
   * Detect device type (Standard Zigbee vs Tuya DP)
   * @param {ZCLNode} zclNode - Zigbee node instance
   * @param {number} endpoint - Endpoint number
   */
  detectDeviceType(zclNode, endpoint = 1) {
    try {
      const ep = zclNode.endpoints[endpoint];
      if (!ep || !ep.clusters) {
        this.deviceType = 'unknown';
        return;
      }

      // Check for Tuya cluster (0xEF00 / 61184)
      const hasTuyaCluster = ep.clusters.tuyaManufacturer
        || ep.clusters.tuyaSpecific
        || ep.clusters.manuSpecificTuya
        || ep.clusters[0xEF00]
        || ep.clusters[61184];

      // Check product ID for TS0601
      const productId = this.device.getData()?.productId || this.device.getSetting('zb_product_id');
      const isTS0601 = productId === 'TS0601';

      // Check for power configuration cluster (SDK3 uses 'powerConfiguration', legacy uses 'genPowerCfg')
      const hasPowerCfg = ep.clusters.powerConfiguration || ep.clusters.genPowerCfg;

      if (hasTuyaCluster || isTS0601) {
        this.deviceType = 'tuya_dp';
        this.isTuyaDevice = true;
        this.device.log('[BATTERY-REPORTING] 🔍 Device type: Tuya TS0601 (DP protocol)');
        // Also check if it has standard battery cluster for hybrid support
        if (hasPowerCfg) {
          this.device.log('[BATTERY-REPORTING] ℹ️ Tuya device also has powerConfiguration cluster (hybrid)');
        }
      } else if (hasPowerCfg) {
        this.deviceType = 'standard';
        this.isTuyaDevice = false;
        this.device.log('[BATTERY-REPORTING] 🔍 Device type: Standard Zigbee (powerConfiguration)');
      } else {
        this.deviceType = 'unknown';
        this.device.log('[BATTERY-REPORTING] ⚠️ Device type: Unknown (no battery cluster detected)');
      }

    } catch (err) {
      this.device.error('[BATTERY-REPORTING] Failed to detect device type:', err.message);
      this.deviceType = 'unknown';
    }
  }

  /**
   * Configure battery reporting for Standard Zigbee device
   * @param {ZCLNode} zclNode - Zigbee node instance
   * @param {number} endpoint - Endpoint number (default: 1)
   * @returns {Promise<boolean>} - Success status
   */
  async configureStandardZigbee(zclNode, endpoint = 1) {
    try {
      const ep = zclNode.endpoints[endpoint];

      // Validate cluster availability (SDK3 uses 'powerConfiguration', legacy uses 'genPowerCfg')
      const powerCfgCluster = ep?.clusters?.powerConfiguration || ep?.clusters?.genPowerCfg;
      if (!ep || !ep.clusters || !powerCfgCluster) {
        this.device.log('[BATTERY-REPORTING] ❌ powerConfiguration cluster not available');
        return false;
      }

      this.device.log('[BATTERY-REPORTING] Configuring Zigbee attribute reporting...');

      // Configure reporting for batteryPercentageRemaining
      // Zigbee scale: 0-200 (0-100% with 0.5% resolution)
      try {
        await powerCfgCluster.configureReporting({
          batteryPercentageRemaining: {
            minInterval: 3600,      // 1 hour minimum (save battery)
            maxInterval: 43200,     // 12 hours maximum
            minChange: 5,           // 2.5% change (value/2)
          },
        });
      } catch (configErr) {
        // Some devices don't support configureReporting - fallback to polling
        this.device.log('[BATTERY-REPORTING] ⚠️ configureReporting failed, fallback to polling:', configErr.message);
        return false;
      }

      this.device.log('[BATTERY-REPORTING] ✅ Zigbee attribute reporting configured');
      this.configured = true;
      return true;

    } catch (err) {
      this.device.error('[BATTERY-REPORTING] Failed to configure Zigbee reporting:', err.message);
      return false;
    }
  }

  /**
   * Configure battery reporting for Tuya DP device
   * @param {ZCLNode} zclNode - Zigbee node instance
   * @returns {Promise<boolean>} - Success status
   */
  async configureTuyaDP(zclNode) {
    try {
      this.device.log('[BATTERY-REPORTING] Configuring Tuya DP battery reporting...');

      // For Tuya devices, battery comes via DP events
      // Common battery DPs: 4, 15, 101
      // No configuration needed - just listen to DP events in setupListener

      this.device.log('[BATTERY-REPORTING] ℹ️ Tuya DP devices use event-based battery reporting');
      this.device.log('[BATTERY-REPORTING] ℹ️ Will listen for battery DPs: 4, 15, 101');
      this.configured = true;
      return true;

    } catch (err) {
      this.device.error('[BATTERY-REPORTING] Failed to configure Tuya DP:', err.message);
      return false;
    }
  }

  /**
   * Configure battery reporting (auto-detects device type)
   * @param {ZCLNode} zclNode - Zigbee node instance
   * @param {number} endpoint - Endpoint number (default: 1)
   * @returns {Promise<boolean>} - Success status
   */
  async configure(zclNode, endpoint = 1) {
    try {
      // Detect device type first
      this.detectDeviceType(zclNode, endpoint);

      // Configure based on device type
      if (this.deviceType === 'standard') {
        return await this.configureStandardZigbee(zclNode, endpoint);
      } else if (this.deviceType === 'tuya_dp') {
        return await this.configureTuyaDP(zclNode);
      } else {
        this.device.log('[BATTERY-REPORTING] ❌ Unknown device type - cannot configure');
        return false;
      }

    } catch (err) {
      this.device.error('[BATTERY-REPORTING] Failed to configure:', err.message);
      return false;
    }
  }

  /**
   * Setup listener for Standard Zigbee battery reports
   * @param {ZCLNode} zclNode - Zigbee node instance
   * @param {number} endpoint - Endpoint number (default: 1)
   */
  setupStandardZigbeeListener(zclNode, endpoint = 1) {
    try {
      const ep = zclNode.endpoints[endpoint];

      // Validate cluster availability
      if (!ep || !ep.clusters || !ep.clusters.genPowerCfg) {
        this.device.log('[BATTERY-REPORTING] Cannot setup Zigbee listener - genPowerCfg not available');
        return;
      }

      // Register attribute listener
      ep.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', (value) => {
        // Convert Zigbee scale (0-200) to percentage (0-100)
        const percent = Math.min(100, Math.max(0, value / 2));

        this.device.log(`[BATTERY-REPORTING] 📊 Zigbee report: ${percent}% (raw: ${value})`);

        // Update capability
        if (this.device.hasCapability('measure_battery')) {
          this.device.setCapabilityValue('measure_battery', percent)
            .catch(err => this.device.error('[BATTERY-REPORTING] Failed to update:', err));
        }
      });

      this.device.log('[BATTERY-REPORTING] ✅ Zigbee listener registered');
      this.listenerRegistered = true;

    } catch (err) {
      this.device.error('[BATTERY-REPORTING] Failed to setup Zigbee listener:', err.message);
    }
  }

  /**
   * Setup listener for Tuya DP battery reports
   * @param {ZCLNode} zclNode - Zigbee node instance
   */
  setupTuyaDPListener(zclNode) {
    try {
      this.device.log('[BATTERY-REPORTING] Setting up Tuya DP battery listener...');

      // Check if device has TuyaEF00Manager
      if (!this.device.tuyaEF00Manager) {
        this.device.log('[BATTERY-REPORTING] ⚠️ No TuyaEF00Manager found - will try direct DP access');

        // Fallback: Try to access Tuya cluster directly
        const ep = zclNode.endpoints[1];
        const tuyaCluster = ep?.clusters?.tuyaManufacturer
          || ep?.clusters?.tuyaSpecific
          || ep?.clusters?.manuSpecificTuya
          || ep?.clusters[0xEF00]
          || ep?.clusters[61184];

        if (tuyaCluster) {
          // Listen to dataReport events
          if (typeof tuyaCluster.on === 'function') {
            tuyaCluster.on('dataReport', (data) => {
              this.handleTuyaDPBattery(data);
            });
            this.device.log('[BATTERY-REPORTING] ✅ Direct Tuya cluster listener registered');
            this.listenerRegistered = true;
          }
        } else {
          this.device.log('[BATTERY-REPORTING] ❌ No Tuya cluster access');
        }
        return;
      }

      // Use TuyaEF00Manager events
      // Listen for common battery DPs: 4, 15, 101
      const batteryDPs = [4, 15, 101];

      batteryDPs.forEach(dp => {
        this.device.tuyaEF00Manager.on(`dp-${dp}`, (value) => {
          this.device.log(`[BATTERY-REPORTING] 📊 Tuya DP ${dp} report: ${value}%`);

          // Update capability
          if (this.device.hasCapability('measure_battery')) {
            const percent = Math.min(100, Math.max(0, value));
            this.device.setCapabilityValue('measure_battery', percent)
              .catch(err => this.device.error('[BATTERY-REPORTING] Failed to update:', err));
          }
        });
      });

      this.device.log('[BATTERY-REPORTING] ✅ Tuya DP listeners registered (DPs: 4, 15, 101)');
      this.listenerRegistered = true;

    } catch (err) {
      this.device.error('[BATTERY-REPORTING] Failed to setup Tuya DP listener:', err.message);
    }
  }

  /**
   * Handle Tuya DP battery data (fallback direct parsing)
   * @param {Object} data - Tuya DP data
   */
  handleTuyaDPBattery(data) {
    try {
      if (!data || (!data.dpId && !data.dp)) return;

      const dp = data.dpId || data.dp;
      const value = data.dpValue || data.data;

      // Battery DPs: 4, 15, 101
      if ([4, 15, 101].includes(dp)) {
        this.device.log(`[BATTERY-REPORTING] 📊 Tuya DP ${dp} battery: ${value}%`);

        if (this.device.hasCapability('measure_battery')) {
          const percent = Math.min(100, Math.max(0, value));
          this.device.setCapabilityValue('measure_battery', percent)
            .catch(err => this.device.error('[BATTERY-REPORTING] Failed to update:', err));
        }
      }
    } catch (err) {
      this.device.error('[BATTERY-REPORTING] Failed to handle Tuya DP battery:', err.message);
    }
  }

  /**
   * Setup listener (auto-detects device type)
   * @param {ZCLNode} zclNode - Zigbee node instance
   * @param {number} endpoint - Endpoint number (default: 1)
   */
  setupListener(zclNode, endpoint = 1) {
    try {
      // Setup based on device type
      if (this.deviceType === 'standard') {
        this.setupStandardZigbeeListener(zclNode, endpoint);
      } else if (this.deviceType === 'tuya_dp') {
        this.setupTuyaDPListener(zclNode);
      } else {
        this.device.log('[BATTERY-REPORTING] ❌ Unknown device type - cannot setup listener');
      }

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
