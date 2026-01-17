'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const mapTuyaDPToCapabilities = require('../tuya/dpMapper');
const TuyaCommandSender = require('../tuya/TuyaCommandSender');
const TuyaDPFlowCardManager = require('../tuya/TuyaDPFlowCardManager');

/**
 * BaseTuyaDPDevice - v5.3.17
 *
 * Universal base class for ALL Tuya DP (TS0601) devices.
 *
 * Features:
 * - Automatic EF00 cluster detection and binding
 * - dataReport / dataResponse listener registration
 * - Universal DP → Capability mapping
 * - Time sync handling
 * - Battery fallback for sleepy devices
 * - Flow card triggering for battery changes
 *
 * Usage:
 *   class MySensorDevice extends BaseTuyaDPDevice {
 *     async onNodeInit() {
 *       await super.onNodeInit();
 *       // Add device-specific initialization here
 *     }
 *   }
 */
class BaseTuyaDPDevice extends ZigBeeDevice {

  /**
   * Called when device node is initialized
   */
  async onNodeInit() {
    this.log('═══════════════════════════════════════════════════════════════');
    this.log('[TUYA-DP] BaseTuyaDPDevice initializing...');
    this.log('═══════════════════════════════════════════════════════════════');

    // Get device info
    const node = this.node;
    const deviceData = this.getData();

    this.log(`[TUYA-DP] Model: ${node?.modelId || 'unknown'}`);
    this.log(`[TUYA-DP] Manufacturer: ${node?.manufacturerName || 'unknown'}`);
    this.log(`[TUYA-DP] Device ID: ${deviceData?.id || 'unknown'}`);

    // Store device type markers
    this.setStoreValue('is_tuya_dp', true).catch(() => { });
    this.setStoreValue('model_id', node?.modelId).catch(() => { });
    this.setStoreValue('manufacturer', node?.manufacturerName).catch(() => { });

    // Initialize Tuya EF00 cluster
    await this._initTuyaCluster();

    // Setup battery handling
    await this._initBatteryHandling();

    // Setup flow card handlers
    this._initFlowCards();

    // v5.5.603: Initialize DP FlowCard manager for forum #1016 support
    this._initDPFlowCardManager();

    // Set default battery value if needed
    if (this.hasCapability('measure_battery')) {
      const currentBattery = this.getCapabilityValue('measure_battery');
      if (currentBattery === null || currentBattery === undefined) {
        this.log('[TUYA-DP] Setting default battery value: 100%');
        await this.setCapabilityValue('measure_battery', 100).catch(() => { });
      }
    }

    this.log('[TUYA-DP] ✅ BaseTuyaDPDevice initialization complete');
  }

  /**
   * Initialize Tuya EF00 cluster
   */
  async _initTuyaCluster() {
    this.log('[TUYA-DP] Looking for Tuya EF00 cluster...');

    const zclNode = this.zclNode;
    if (!zclNode || !zclNode.endpoints) {
      this.log('[TUYA-DP] ⚠️ No ZCL node available');
      return;
    }

    // Try to find the Tuya cluster on any endpoint
    let tuyaCluster = null;
    let endpointId = null;

    for (const [epId, endpoint] of Object.entries(zclNode.endpoints)) {
      if (!endpoint.clusters) continue;

      // Try all possible cluster names
      const possibleNames = [
        'tuya',
        'tuyaManufacturer',
        'tuyaSpecific',
        'manuSpecificTuya',
        '61184',
        0xEF00,
        '0xEF00'
      ];

      for (const name of possibleNames) {
        if (endpoint.clusters[name]) {
          tuyaCluster = endpoint.clusters[name];
          endpointId = epId;
          this.log(`[TUYA-DP] ✅ Found Tuya cluster on endpoint ${epId} as '${name}'`);
          break;
        }
      }

      if (tuyaCluster) break;
    }

    if (!tuyaCluster) {
      this.log('[TUYA-DP] ⚠️ No Tuya EF00 cluster found');
      this.log('[TUYA-DP] Available clusters:', Object.keys(zclNode.endpoints[1]?.clusters || {}));
      return;
    }

    // Store reference
    this._tuyaCluster = tuyaCluster;
    this._tuyaEndpointId = endpointId;

    // Register listeners
    await this._registerTuyaListeners(tuyaCluster);

    // Send time sync
    await this._sendTimeSync();
  }

  /**
   * Register listeners for Tuya data reports
   */
  async _registerTuyaListeners(tuyaCluster) {
    this.log('[TUYA-DP] Registering data report listeners...');

    // Try different event names
    const eventNames = [
      'commandDataReport',
      'commandDataResponse',
      'dataReport',
      'dataResponse',
      'report',
      'response'
    ];

    for (const eventName of eventNames) {
      try {
        if (typeof tuyaCluster.on === 'function') {
          tuyaCluster.on(eventName, (payload) => {
            this.log(`[TUYA-DP] 📥 ${eventName}:`, JSON.stringify(payload).substring(0, 200));
            this._onTuyaDataReport(payload);
          });
          this.log(`[TUYA-DP] ✅ Registered listener for '${eventName}'`);
        }
      } catch (err) {
        this.log(`[TUYA-DP] ⚠️ Could not register '${eventName}': ${err.message}`);
      }
    }

    // Also try cluster attribute listener
    try {
      if (typeof tuyaCluster.onReport === 'function') {
        tuyaCluster.onReport('dataPoints', (value) => {
          this.log('[TUYA-DP] 📥 onReport dataPoints:', value);
          this._onTuyaDataReport({ dpValues: value });
        });
      }
    } catch (err) {
      // Ignore
    }
  }

  /**
   * Handle incoming Tuya data report
   */
  _onTuyaDataReport(payload) {
    if (!payload) return;

    this.log('[TUYA-DP] Processing data report...');

    // Extract DP values from various payload formats
    let dpValues = payload.dpValues || payload.dps || payload.data || [];

    // Handle single DP format
    if (payload.dp !== undefined && payload.data !== undefined) {
      dpValues = [{ dp: payload.dp, dataType: payload.dataType, data: payload.data }];
    }

    // Handle raw buffer
    if (Buffer.isBuffer(dpValues)) {
      dpValues = this._parseRawTuyaFrame(dpValues);
    }

    // Handle array format
    if (!Array.isArray(dpValues)) {
      if (typeof dpValues === 'object') {
        dpValues = Object.entries(dpValues).map(([dp, value]) => ({
          dp: parseInt(dp),
          value
        }));
      } else {
        return;
      }
    }

    // Process each DP
    for (const dpValue of dpValues) {
      const dp = dpValue.dp || dpValue.dpId;
      const dataType = dpValue.dataType || dpValue.type || 0;
      const data = dpValue.data || dpValue.value;

      if (dp === undefined) continue;

      // Parse value based on data type
      let parsedValue = this._parseDPValue(dataType, data);

      this.log(`[TUYA-DP] DP${dp} (type=${dataType}) = ${JSON.stringify(parsedValue)}`);

      // v5.5.603: Notify DP FlowCard manager for threshold/trigger handling (forum #1016)
      if (this._dpFlowManager) {
        this._dpFlowManager.onDPValueChanged(dp, parsedValue, dataType);
      }

      // Use the universal mapper
      mapTuyaDPToCapabilities(this, dp, parsedValue);
    }
  }

  /**
   * Parse DP value based on data type
   */
  _parseDPValue(dataType, data) {
    if (data === undefined || data === null) return null;

    // If already parsed
    if (typeof data === 'number' || typeof data === 'boolean') {
      return data;
    }

    // Handle buffer
    if (Buffer.isBuffer(data)) {
      switch (dataType) {
      case 0x00: // Boolean
        return data[0] === 1;
      case 0x01: // Value (signed 32-bit)
        return data.length >= 4 ? data.readInt32BE(0) : data[0];
      case 0x02: // String
        return data.toString('utf8');
      case 0x03: // Enum
        return data[0];
      case 0x04: // Bitmap
        return data.length >= 4 ? data.readUInt32BE(0) : data[0];
      case 0x05: // Raw
      default:
        if (data.length >= 4) {
          return data.readUInt32BE(0);
        }
        return data[0];
      }
    }

    return data;
  }

  /**
   * Parse raw Tuya frame buffer
   */
  _parseRawTuyaFrame(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 4) return [];

    const dpValues = [];
    let offset = 0;

    while (offset < buffer.length - 3) {
      const dp = buffer[offset];
      const dataType = buffer[offset + 1];
      const dataLen = buffer.readUInt16BE(offset + 2);

      if (offset + 4 + dataLen > buffer.length) break;

      const data = buffer.slice(offset + 4, offset + 4 + dataLen);
      dpValues.push({ dp, dataType, data });

      offset += 4 + dataLen;
    }

    return dpValues;
  }

  /**
   * Send time sync to device
   */
  async _sendTimeSync() {
    if (!this._tuyaCluster) return;

    this.log('[TUYA-DP] ⏰ Sending time sync...');

    try {
      const success = await TuyaCommandSender.sendTimeSync(this._tuyaCluster, this);
      if (success) {
        this.log('[TUYA-DP] ✅ Time sync sent');
      } else {
        this.log('[TUYA-DP] ⚠️ Time sync not supported or failed');
      }
    } catch (err) {
      this.error('[TUYA-DP] Time sync error:', err.message);
    }
  }

  /**
   * Initialize battery handling
   */
  async _initBatteryHandling() {
    if (!this.hasCapability('measure_battery')) {
      this.log('[TUYA-DP] No battery capability, skipping battery init');
      return;
    }

    this.log('[TUYA-DP] Setting up battery handling...');

    // Try ZCL battery cluster first
    try {
      const batteryCluster = this.getClusterEndpoint('genPowerCfg');
      if (batteryCluster) {
        this.log('[TUYA-DP] Found ZCL battery cluster, configuring...');
        await this.configureAttributeReporting([
          {
            endpointId: batteryCluster,
            cluster: 'genPowerCfg',
            attributeName: 'batteryPercentageRemaining',
            minInterval: 600,
            maxInterval: 86400,
            minChange: 1
          }
        ]).catch(err => {
          this.log('[TUYA-DP] ⚠️ Battery reporting config failed (sleepy device?):', err.message);
        });
      }
    } catch (err) {
      this.log('[TUYA-DP] No ZCL battery cluster, will use Tuya DP');
    }

    // Listen for Tuya battery events
    this.on('tuya_dp_battery', async (value) => {
      this.log(`[TUYA-DP] 🔋 Battery update from Tuya DP: ${value}%`);
      await this.setCapabilityValue('measure_battery', parseFloat(value)).catch(e => this.error(e));
      this._triggerBatteryFlowCard(value);
    });
  }

  /**
   * Initialize flow cards
   */
  _initFlowCards() {
    this.log('[TUYA-DP] Setting up flow cards...');

    // Track last battery value for flow cards
    this._lastBatteryValue = this.getCapabilityValue('measure_battery');
  }

  /**
   * v5.5.603: Initialize DP FlowCard manager (forum #1016)
   * Provides automatic DP → FlowCard triggering, conditions, and actions
   */
  _initDPFlowCardManager() {
    try {
      this._dpFlowManager = new TuyaDPFlowCardManager(this, this.homey);
      this._dpFlowManager.initialize(this.getDPConfig ? this.getDPConfig() : {});
      this.log('[TUYA-DP] ✅ DP FlowCard manager initialized');
    } catch (err) {
      this.error('[TUYA-DP] ⚠️ DP FlowCard manager init failed:', err.message);
    }
  }

  /**
   * Trigger battery changed flow card
   */
  async _triggerBatteryFlowCard(value) {
    const prev = this._lastBatteryValue;
    this._lastBatteryValue = value;

    // Skip if no change
    if (prev === value) return;

    try {
      // Universal battery flow card
      const card = this.homey.flow.getDeviceTriggerCard('universal_battery_changed');
      if (card) {
        await card.trigger(this, {
          battery: value,
          device_name: this.getName()
        });
        this.log('[TUYA-DP] ✅ Flow card triggered: universal_battery_changed');
      }
    } catch (err) {
      this.log('[TUYA-DP] ⚠️ Flow card trigger error:', err.message);
    }
  }

  /**
   * Send a DP value to the device
   */
  async sendDP(dp, dataType, value) {
    if (!this._tuyaCluster) {
      this.error('[TUYA-DP] Cannot send DP - no cluster available');
      return false;
    }

    this.log(`[TUYA-DP] 📤 Sending DP${dp} = ${value} (type=${dataType})`);

    try {
      return await TuyaCommandSender.setDP(this._tuyaCluster, this, dp, dataType, value);
    } catch (err) {
      this.error('[TUYA-DP] Send DP error:', err.message);
      return false;
    }
  }

  /**
   * Request a DP value from the device
   */
  async requestDP(dp) {
    if (!this._tuyaCluster) {
      this.error('[TUYA-DP] Cannot request DP - no cluster available');
      return false;
    }

    this.log(`[TUYA-DP] 📤 Requesting DP${dp}`);

    try {
      return await TuyaCommandSender.getDP(this._tuyaCluster, this, dp);
    } catch (err) {
      this.error('[TUYA-DP] Request DP error:', err.message);
      return false;
    }
  }

  /**
   * Called when device is deleted
   */
  async onDeleted() {
    this.log('[TUYA-DP] Device deleted');
    super.onDeleted();
  }
}

module.exports = BaseTuyaDPDevice;
