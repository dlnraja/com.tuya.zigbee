'use strict';
const { safeParse } = require('../utils/tuyaUtils.js');


const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


/**
 * TuyaDeviceMixin - v5.3.15
 *
 * Mixin to add Tuya EF00 support to any ZigBeeDevice
 *
 * USAGE:
 * const { ZigBeeDevice } = require('homey-zigbeedriver');
 * // A8: NaN Safety - use safeDivide/safeMultiply
  require('../../lib/mixins/TuyaDeviceMixin');
 *
 * class MyDevice extends TuyaDeviceMixin(ZigBeeDevice) {
 *   async onNodeInit({ zclNode }) {
 *     await super.onNodeInit({ zclNode });
 *     // device-specific code
 *   }
 *
 *   // Override for device-specific DP handling
 *   handleDP(dp, value) {
 *     switch (dp) {
 *       case 1: this.setCapability('onoff', value); break;
 *       // ...
 *     }
 *   }
 * }
 */

const TuyaEF00Parser = require('../tuya/TuyaEF00Parser');
const UnifiedBatteryHandler = require('../battery/UnifiedBatteryHandler');

function TuyaDeviceMixin(Base) {
  return class extends Base {

    /**
     * Initialize Tuya device
     */
    async onNodeInit({ zclNode }) {
      // Guard against double initialization
      if (this._tuyaMixinInitialized) {
        this.log('[TUYA-MIXIN]  Already initialized');
        return;
      }
      this._tuyaMixinInitialized = true;

      this.log('[TUYA-MIXIN]  Initializing...');

      // Store zclNode
      this.zclNode = zclNode;

      // 
      // STEP 1: Setup Tuya EF00 cluster listener
      // 
      await this._setupTuyaCluster(zclNode);

      // 
      // STEP 2: Setup battery handling
      // 
      await this._setupBattery(zclNode);

      // 
      // STEP 3: Handle sleepy devices
      // 
      if (this._isBatteryDevice()) {
        this._setSleepy(true);
        this.log('[TUYA-MIXIN]  Marked as sleepy device');
      }

      // 
      // STEP 4: Request initial DPs (mains devices only)
      // 
      if (!this._isBatteryDevice()) {
        setTimeout(() => this._requestAllDPs(), 3000);
      }

      // 
      // STEP 5: Register flow cards (only if capability exists)
      // 
      this._registerFlowCards();

      // 
      // STEP 6: Set device available
      // 
      await this.setAvailable().catch(() => { });

      this.log('[TUYA-MIXIN]  Initialization complete');
    }

    /**
     * Setup Tuya EF00 cluster
     */
    async _setupTuyaCluster(zclNode) {
      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint?.clusters) {
        this.log('[TUYA-MIXIN] No endpoint 1 clusters');
        return;
      }

      // Find Tuya cluster using defensive lookup
      const tuyaCluster = this.getSafeCluster('tuya') || 
                          this.getSafeCluster(CLUSTERS.TUYA_EF00) ||
                          endpoint.clusters.manuSpecificTuya ||
                          endpoint.clusters.tuyaSpecific ||
                          endpoint.clusters[CLUSTERS.TUYA_EF00];

      if (!tuyaCluster) {
        this.log('[TUYA-MIXIN]  No Tuya cluster found (even with raw fallback)');
        this.log('[TUYA-MIXIN] Available:', Object.keys(endpoint.clusters));
        return;
      }

      this.log('[TUYA-MIXIN]  Tuya cluster found');

      // Create parser
      this.tuya = new TuyaEF00Parser(this);

      // Setup command listener
      if (typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('command', (commandId, payload) => {
          this.log(`[TUYA-MIXIN]  Command 0x${commandId.toString(16)}`);

          // Parse DP reports
          if (commandId === 0x01 || commandId === 0x02) {
            const results = this.tuya.parseMultiDP(payload);
            results.forEach(({ dp, value }) => {
              this.handleDP(dp, value);
      });
          }
        });
        this.log('[TUYA-MIXIN]  Command listener registered');
      }

      // Setup DP event listener
      this.on('dp', ({ dp, value }) => {
        this.handleDP(dp, value);
      });

      // Store cluster reference
      this._tuyaCluster = tuyaCluster;
    }

    /**
     * Setup battery handling
     */
    async _setupBattery(zclNode) {
      // Check if mains powered
      if (this._isMainsPowered()) {
        // Remove battery capability if incorrectly present
        if (this.hasCapability('measure_battery')) {
          this.log('[TUYA-MIXIN]  Mains powered - removing battery');
          await this.removeCapability('measure_battery').catch(() => { });
        }
        return;
      }

      // Setup unified battery handler
      this.batteryHandler = new UnifiedBatteryHandler(this);
      await this.batteryHandler.initialize(zclNode);

      // Set default battery if none received
      if (this.hasCapability('measure_battery')) {
        const current = this.getCapabilityValue('measure_battery');
        if (current === null || current === undefined) {
          this.log('[TUYA-MIXIN]  Setting default battery (100%)');
          await this.setCapabilityValue('measure_battery', 100).catch(() => { });
        }
      }
    }

    /**
     * Handle incoming DP - OVERRIDE IN SUBCLASS
     */
    handleDP(dp, value) {
      this.log(`[TUYA-MIXIN] DP${dp} = ${JSON.stringify(value)}`);

      // Store all DPs
      this.setStoreValue(`dp_${dp}`, value).catch(() => { });
      this.setStoreValue('last_dp_time', Date.now()).catch(() => { });

      // Common DP mappings (override in subclass for specific handling)
      switch (dp) {
      // OnOff (DP 1 for most devices)
      case 1:
        if (this.hasCapability('onoff')) {
          this.setCapabilityValue('onoff', !!value).catch(() => { });
        }
        break;

        // Battery (various DPs)
      case 4:
      case 10:
      case 14:
      case 15:
      case 101:
        if (this.hasCapability('measure_battery')) {
          const percent = Math.max(0, Math.min(100, value));
          this.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
        }
        break;

        // Temperature (usually DP 101 or 1, scaled by 10)
      case 1: // Some sensors
      case 101:
        if (this.hasCapability('measure_temperature') && typeof value === 'number') {
          const temp = safeParse(value, 10);
          if (temp > -50 && temp < 100) {
            this.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(() => { });
          }
        }
        break;

        // Humidity (usually DP 102 or 2)
      case 2:
      case 102:
        if (this.hasCapability('measure_humidity') && typeof value === 'number') {
          const hum = value > 100 ? safeParse(value) : value;
          if (hum >= 0 && hum <= 100) {
            this.setCapabilityValue('measure_humidity', parseFloat(hum)).catch(() => { });
          }
        }
        break;

        // Voltage (DP 247 in mV)
      case 247:
        if (this.hasCapability('measure_voltage')) {
          const voltage = safeParse(value);
          if (voltage > 0 && voltage < 300) {
            this.setCapabilityValue('measure_voltage', parseFloat(voltage)).catch(() => { });
          }
        }
        break;

        // Water alarm (DP 1 for water sensors)
      case 1:
        if (this.hasCapability('alarm_water')) {
          this.setCapabilityValue('alarm_water', !!value).catch(() => { });
        }
        break;

      default:
        this.log(`[TUYA-MIXIN] Unhandled DP${dp} = ${value}`);
      }
    }

    /**
     * Request all common DPs
     */
    async _requestAllDPs() {
      if (!this._tuyaCluster || !this.tuya) {
        this.log('[TUYA-MIXIN] Cannot request DPs - no cluster');
        return;
      }

      this.log('[TUYA-MIXIN]  Requesting all DPs...');

      const commonDPs = [1, 2, 3, 4, 5, 10, 14, 15, 101, 102, 103, 247];

      for (const dp of commonDPs) {
        try {
          const { payload } = this.tuya.buildGetFrame(dp);

          if (typeof this._tuyaCluster.command === 'function') {
            await this._tuyaCluster.command(0x00, payload);
          }

          // Small delay between requests
          await new Promise(r => setTimeout(r, 100));
        } catch (err) {
          // Timeout is normal for battery devices
          if (!err.message?.includes('Timeout')) {
            this.log(`[TUYA-MIXIN] DP${dp} request failed:`, err.message);
          }
        }
      }
    }

    /**
     * Send DP value
     */
    async sendDP(dp, type, value) {
      if (!this._tuyaCluster || !this.tuya) {
        throw new Error('Tuya cluster not available');
      }

      this.log(`[TUYA-MIXIN]  Sending DP${dp} = ${value}`);

      const { payload } = this.tuya.buildSetFrame(dp, type, value);

      if (typeof this._tuyaCluster.command === 'function') {
        await this._tuyaCluster.command(0x00, payload);
        return true;
      }

      return false;
    }

    /**
     * Send boolean DP
     */
    async sendBoolDP(dp, value) {
      return this.sendDP(dp, TuyaEF00Parser.DP_TYPE.BOOL, value);
    }

    /**
     * Send value DP (integer)
     */
    async sendValueDP(dp, value) {
      return this.sendDP(dp, TuyaEF00Parser.DP_TYPE.VALUE, value);
    }

    /**
     * Send enum DP
     */
    async sendEnumDP(dp, value) {
      return this.sendDP(dp, TuyaEF00Parser.DP_TYPE.ENUM, value);
    }

    /**
     * Check if battery device
     */
    _isBatteryDevice() {
      return this.hasCapability('measure_battery') ||
        this.hasCapability('alarm_battery');
    }

    /**
     * Check if mains powered
     */
    _isMainsPowered() {
      // Check power type setting
      const powerType = this.getSetting?.('power_type') || this.powerType;if (powerType === 'MAINS' || powerType === 'AC') return true;

      // Check if no battery cluster and no battery capability
      const endpoint = this.zclNode?.endpoints?.[1];
      const hasBatteryCluster = !!(
        endpoint?.clusters?.powerConfiguration ||
        endpoint?.clusters?.genPowerCfg ||
        endpoint?.clusters?.[1]
      );

      return !hasBatteryCluster && !this.hasCapability('measure_battery');
    }

    /**
     * Mark device as sleepy (for battery devices)
     */
    _setSleepy(sleepy) {
      // Store setting
      this.setStoreValue('is_sleepy', sleepy).catch(() => { });

      // Some devices support this method
      if (typeof super.setSleepy === 'function') {
        super.setSleepy(sleepy);
      }
    }

    /**
     * Register flow cards dynamically
     */
    _registerFlowCards() {
      // Only register if capability exists
      // This prevents "Invalid Flow Card ID" errors

      // Flow cards are automatically registered by Homey from driver.flow.compose.json
      // We don't need to manually register them here
      this.log('[TUYA-MIXIN] Flow cards handled by Homey SDK');
    }

    /**
     * Set capability with error handling
     */
    async setCapability(capability, value) {
      if (this.hasCapability(capability)) {
        return this.setCapabilityValue(capability, value).catch(err => {
          this.error(`[TUYA-MIXIN] Failed to set ${capability}:`, err.message);
      });
      }
    }

    /**
     * getSafeCluster - Defensive cluster retrieval with raw ID fallback
     * Ensures we can find clusters even if Homey skips their named definitions
     * @param {string|number} clusterId - Cluster name or numeric ID
     * @param {number} [endpointId=1] - Endpoint ID
     */
    getSafeCluster(clusterId, endpointId = 1) {
      if (!this.zclNode || !this.zclNode.endpoints) return null;
      
      try {
        const endpoint = this.zclNode.endpoints[endpointId];
        if (!endpoint || !endpoint.clusters) return null;
        
        // 1. Try direct lookup (supports both name and numeric ID as key)
        if (endpoint.clusters[clusterId]) return endpoint.clusters[clusterId];
        
        // 2. Try common numeric mapping if name is used
        if (typeof clusterId === 'string') {
          const commonMap = {
            'basic': 0, 'powerconfig': 1, 'identify': 3, 'onoff': 6, 'levelcontrol': 8,
            'time': 10, 'binaryinput': 15, 'ota': 25, 'windowcovering': 258,
            'thermostat': 513, 'fancontrol': 514, 'colorcontrol': 768,
            'illuminance': 1024, 'temperature': 1026, 'humidity': 1029,
            'occupancy': 1030, 'iaszone': 1280, 'metering': 1794,
            'electricalmeasurement': 2820, 'tuya': CLUSTERS.TUYA_EF00
          };
          const numericId = commonMap[clusterId.toLowerCase()];
          if (numericId !== undefined && endpoint.clusters[numericId]) {
            return endpoint.clusters[numericId];
          }
        }
      } catch (err) {
        this.log(`[SAFETY-CLUSTER] Failed to find ${clusterId}: ${err.message}`);
      }
      return null;
    }

    /**
     * Cleanup on delete
     */
    async onDeleted() {
      this.log('[TUYA-MIXIN] Device deleted');

      // Remove listeners
      if (this._tuyaCluster) {
        this._tuyaCluster.removeAllListeners?.();
      }

      if (super.onDeleted) {
        await super.onDeleted();
      }
    }
  };
}

module.exports = TuyaDeviceMixin;


