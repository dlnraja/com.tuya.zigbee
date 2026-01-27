'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const PeriodicAutoEnricherMixin = require('../mixins/PeriodicAutoEnricherMixin');

/**
 * TuyaSpecificClusterDevice
 * Base class for Tuya devices using manufacturer-specific cluster (0xEF00 / 61184)
 * Handles Tuya Datapoint (DP) protocol
 * 
 * v5.5.740: Enhanced with patterns from JohanBendz PR analysis:
 * - PR #1204: Enhanced retry logic, input validation, bulk commands
 * - PR #774: writeBitmap method, device readiness checks
 * - PR #740: Utils pattern for dataPoints
 */
class TuyaSpecificClusterDevice extends ZigBeeDevice {

  // Transaction ID management (from PR #774/#1204)
  _transactionID = 0;
  set transactionID(val) { this._transactionID = val % 256; }
  get transactionID() { return this._transactionID; }

  // Debug mode flag
  debugEnabled = false;

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.log('TuyaSpecificClusterDevice initializing...');

    // Store Tuya DP mappings
    this._tuyaDatapoints = new Map();

    // v5.5.740: Wait for device to be ready (from PR #1204)
    try {
      await this.waitForDeviceReady(5000);
      this.debug('Tuya device is ready for communication');
    } catch (error) {
      this.error('Device failed to become ready:', error);
    }

    // Listen to Tuya manufacturer-specific cluster
    this.setupTuyaCluster();

    this.log('TuyaSpecificClusterDevice ready');

    // v5.5.855: Start periodic auto-enrichment (15min + hourly scans)
    if (typeof this.initPeriodicAutoEnricher === 'function') {
      this.initPeriodicAutoEnricher();
    }
  }

  /**
   * Setup Tuya manufacturer-specific cluster listener
   * v5.5.820: CRITICAL FIX - Try ALL possible cluster names
   */
  setupTuyaCluster() {
    try {
      // v5.5.820: CRITICAL - Try ALL possible Tuya cluster names!
      // This was the root cause of "devices not working after re-pair"
      const endpoint = this.zclNode?.endpoints?.[1];
      if (!endpoint?.clusters) {
        this.error('[TUYA] ❌ No clusters on endpoint 1');
        return;
      }

      // Try all known Tuya cluster names
      const clusterNames = [
        'manuSpecificTuya',
        'tuya',
        'tuyaSpecific', 
        61184,
        0xEF00,
        '61184',
        '0xEF00'
      ];

      let tuyaCluster = null;
      let foundName = null;

      for (const name of clusterNames) {
        if (endpoint.clusters[name]) {
          tuyaCluster = endpoint.clusters[name];
          foundName = name;
          break;
        }
      }

      // v5.5.820: Also check for cluster by iterating (case-insensitive)
      if (!tuyaCluster) {
        for (const [key, cluster] of Object.entries(endpoint.clusters)) {
          const keyLower = String(key).toLowerCase();
          if (keyLower.includes('tuya') || keyLower.includes('ef00') || key === '61184') {
            tuyaCluster = cluster;
            foundName = key;
            break;
          }
        }
      }

      if (!tuyaCluster) {
        this.error('[TUYA] ❌ Tuya cluster not found!');
        this.error('[TUYA] Available clusters:', Object.keys(endpoint.clusters).join(', '));
        
        // v5.5.820: Try to setup raw frame listener as fallback
        this._setupRawFrameFallback(endpoint);
        return;
      }

      this.log(`[TUYA] ✅ Found Tuya cluster: ${foundName}`);
      this._tuyaCluster = tuyaCluster; // Store reference

      // Setup all possible event listeners
      const eventNames = ['dataReport', 'response', 'reporting', 'data', 'dp', 'datapoint'];
      
      for (const eventName of eventNames) {
        if (typeof tuyaCluster.on === 'function') {
          tuyaCluster.on(eventName, (data) => {
            this.log(`[TUYA] 📥 ${eventName} event received`);
            if (eventName === 'dataReport' || eventName === 'data' || eventName === 'dp') {
              this.handleTuyaDataReport(data);
            } else {
              this.handleTuyaResponse(data);
            }
          });
        }
      }

      this.log('[TUYA] ✅ All event listeners configured');

    } catch (err) {
      this.error('[TUYA] Failed to setup Tuya cluster:', err);
    }
  }

  /**
   * v5.5.820: Fallback for raw Zigbee frame handling
   * When cluster is not found, try to intercept raw frames
   */
  _setupRawFrameFallback(endpoint) {
    this.log('[TUYA-FALLBACK] Setting up raw frame listener...');
    
    try {
      // Listen on endpoint level for any incoming data
      if (typeof endpoint.on === 'function') {
        endpoint.on('frame', (clusterId, data, meta) => {
          // Check if this is a Tuya frame (cluster 0xEF00 = 61184)
          if (clusterId === 61184 || clusterId === 0xEF00) {
            this.log('[TUYA-RAW] 📥 Raw Tuya frame received!');
            this._parseRawTuyaFrame(data);
          }
        });
        this.log('[TUYA-FALLBACK] ✅ Raw frame listener active');
      }
    } catch (err) {
      this.error('[TUYA-FALLBACK] Setup failed:', err.message);
    }
  }

  /**
   * v5.5.820: Parse raw Tuya frame
   */
  _parseRawTuyaFrame(data) {
    try {
      if (!Buffer.isBuffer(data) || data.length < 7) return;
      
      // Tuya frame format: [status][seq][dp][type][len_hi][len_lo][data...]
      const dp = data[2];
      const datatype = data[3];
      const len = data.readUInt16BE(4);
      
      let value;
      if (datatype === 1 && len === 1) { // Bool
        value = data[6] === 1;
      } else if (datatype === 2 && len === 4) { // Value
        value = data.readInt32BE(6);
      } else if (datatype === 4 && len === 1) { // Enum
        value = data[6];
      } else {
        value = data.slice(6, 6 + len);
      }

      this.log(`[TUYA-RAW] DP${dp} = ${value}`);
      this.handleTuyaDataReport({ dp, data: value, value, datatype });
      
    } catch (err) {
      this.error('[TUYA-RAW] Parse error:', err.message);
    }
  }

  /**
   * Register a Tuya datapoint to Homey capability mapping
   * @param {number} dp - Datapoint ID
   * @param {string} capability - Homey capability name
   * @param {object} options - Conversion options (scale, offset, etc.)
   */
  registerTuyaDatapoint(dp, capability, options = {}) {
    this._tuyaDatapoints.set(dp, {
      capability,
      scale: options.scale || 1,
      offset: options.offset || 0,
      type: options.type || 'value',
      invert: options.invert || false,
    });

    this.log(`Registered Tuya DP ${dp} → ${capability}`);
  }

  /**
   * Handle Tuya datapoint report
   */
  handleTuyaDataReport(data) {
    if (!data || !data.dp) {
      this.log('Invalid Tuya data report');
      return;
    }

    const dpId = data.dp;
    const dpMapping = this._tuyaDatapoints.get(dpId);

    if (!dpMapping) {
      this.log(`Unregistered Tuya DP ${dpId}:`, data);
      return;
    }

    try {
      const value = this.convertTuyaValue(data, dpMapping);

      this.log(`Tuya DP ${dpId} → ${dpMapping.capability} = ${value}`);

      // Update capability
      this.setCapabilityValue(dpMapping.capability, value).catch(err => {
        this.error(`Failed to set ${dpMapping.capability}:`, err);
      });

    } catch (err) {
      this.error(`Failed to convert Tuya DP ${dpId}:`, err);
    }
  }

  /**
   * Convert Tuya datapoint value to Homey capability value
   */
  convertTuyaValue(data, mapping) {
    let value = data.data || data.value || 0;

    // Type conversion
    switch (mapping.type) {
    case 'bool':
      value = Boolean(value);
      if (mapping.invert) value = !value;
      break;

    case 'value':
      value = Number(value);
      value = (value / mapping.scale) + mapping.offset;
      break;

    case 'enum':
      // Keep as-is for enum values
      break;

    case 'bitmap':
      value = Number(value);
      break;

    default:
      this.log(`Unknown Tuya type: ${mapping.type}`);
    }

    return value;
  }

  /**
   * Handle Tuya response
   */
  handleTuyaResponse(data) {
    this.log('Tuya response received:', data);
    // Override in subclass if needed
  }

  /**
   * Send Tuya datapoint command
   * @param {number} dp - Datapoint ID
   * @param {*} value - Value to send
   * @param {string} type - Data type ('bool', 'value', 'enum', 'string')
   */
  async sendTuyaCommand(dp, value, type = 'value') {
    try {
      // v5.5.820: Try ALL cluster names
      const endpoint = this.zclNode?.endpoints?.[1];
      const tuyaCluster = endpoint?.clusters?.manuSpecificTuya ||
                          endpoint?.clusters?.tuya ||
                          endpoint?.clusters?.tuyaSpecific ||
                          endpoint?.clusters?.[61184] ||
                          endpoint?.clusters?.[0xEF00] ||
                          this._tuyaCluster;

      if (!tuyaCluster) {
        throw new Error('Tuya cluster not available - try re-pairing device');
      }

      this.log(`Sending Tuya command: DP ${dp} = ${value} (${type})`);

      // Prepare data based on type
      let data;
      switch (type) {
      case 'bool':
        data = value ? 1 : 0;
        break;
      case 'value':
        data = Number(value);
        break;
      case 'enum':
        data = Number(value);
        break;
      case 'string':
        data = String(value);
        break;
      default:
        data = value;
      }

      // Send command to Tuya cluster using available method
      // v5.3.56: Fix for SDK3 - dataRequest may not exist
      if (typeof tuyaCluster.dataRequest === 'function') {
        await tuyaCluster.dataRequest({
          dp,
          data,
          datatype: this.getTuyaDataType(type),
        });
      } else if (typeof tuyaCluster.setData === 'function') {
        // Alternative method for SDK3
        const payload = this._buildTuyaPayload(dp, data, type);
        await tuyaCluster.setData({ data: payload });
      } else if (typeof tuyaCluster.sendCommand === 'function') {
        // Raw command fallback
        const payload = this._buildTuyaPayload(dp, data, type);
        await tuyaCluster.sendCommand(0x00, payload);
      } else {
        throw new Error('No suitable method found for Tuya command');
      }

      this.log('✅ Tuya command sent successfully');

    } catch (err) {
      this.error('Failed to send Tuya command:', err);
      throw err;
    }
  }

  /**
   * Build Tuya payload for setData/sendCommand
   * v5.3.56: Helper for SDK3 compatibility
   */
  _buildTuyaPayload(dp, value, type) {
    const datatype = this.getTuyaDataType(type);
    const { Buffer } = require('buffer');

    let dataBuffer;
    switch (datatype) {
    case 1: // BOOL
      dataBuffer = Buffer.from([value ? 1 : 0]);
      break;
    case 2: // VALUE (32-bit int)
      dataBuffer = Buffer.alloc(4);
      dataBuffer.writeInt32BE(value, 0);
      break;
    case 3: // STRING
      dataBuffer = Buffer.from(String(value), 'utf8');
      break;
    case 4: // ENUM
      dataBuffer = Buffer.from([value & 0xFF]);
      break;
    default:
      dataBuffer = Buffer.from([value]);
    }

    // Tuya frame: [status:1][seq:1][dp:1][type:1][len:2][data:N]
    const payload = Buffer.alloc(6 + dataBuffer.length);
    payload.writeUInt8(0x00, 0); // Status
    payload.writeUInt8(0x00, 1); // Seq (will be set by cluster)
    payload.writeUInt8(dp, 2);   // DP ID
    payload.writeUInt8(datatype, 3); // Data type
    payload.writeUInt16BE(dataBuffer.length, 4); // Data length
    dataBuffer.copy(payload, 6); // Data

    return payload;
  }

  /**
   * Get Tuya datatype ID
   */
  getTuyaDataType(type) {
    const types = {
      'bool': 1,
      'value': 2,
      'string': 3,
      'enum': 4,
      'bitmap': 5,
    };
    return types[type] || 2;
  }

  /**
   * Register capability listener with Tuya DP sending
   */
  registerTuyaCapabilityListener(capability, dp, options = {}) {
    this.registerCapabilityListener(capability, async (value) => {
      this.log(`${capability} changed to:`, value);

      // Convert Homey value to Tuya value
      let tuyaValue = value;

      if (options.scale) {
        tuyaValue = Math.round(value * options.scale);
      }

      if (options.invert) {
        tuyaValue = !tuyaValue;
      }

      await this.sendTuyaCommand(dp, tuyaValue, options.type || 'value');
    });

    this.log(`Registered ${capability} listener → Tuya DP ${dp}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v5.5.740: Enhanced methods from JohanBendz PR #1204 analysis
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if device is ready for Tuya communication
   * v5.5.820: Enhanced to check ALL possible cluster names
   */
  isDeviceReady() {
    if (!this.zclNode?.endpoints?.[1]?.clusters) return false;
    
    const clusters = this.zclNode.endpoints[1].clusters;
    
    // Check all possible Tuya cluster names
    return !!(clusters.tuya || 
              clusters.manuSpecificTuya ||
              clusters.tuyaSpecific ||
              clusters[61184] ||
              clusters[0xEF00] ||
              clusters['61184']);
  }

  /**
   * Wait for device to be ready with timeout
   * Source: PR #1204 (gpmachado)
   */
  async waitForDeviceReady(timeout = 10000) {
    const startTime = Date.now();
    while (!this.isDeviceReady()) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Device not ready within timeout period');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Enhanced debug logging with device context
   * Source: PR #1204 (gpmachado)
   */
  debug(message, data = null) {
    if (this.debugEnabled) {
      const timestamp = new Date().toISOString();
      const deviceName = this.getName?.() || 'TuyaDevice';
      if (data) {
        console.log(`[${timestamp}] [${deviceName}] DEBUG: ${message}`, data);
      } else {
        console.log(`[${timestamp}] [${deviceName}] DEBUG: ${message}`);
      }
    }
  }

  /**
   * Get device transaction statistics
   * Source: PR #1204 (gpmachado)
   */
  getTransactionStats() {
    return {
      currentTransactionId: this._transactionID,
      deviceReady: this.isDeviceReady(),
      deviceName: this.getName?.() || 'Unknown',
      retryConfig: { maxRetries: 2, baseDelay: 300, backoffType: 'linear' }
    };
  }

  /**
   * Reset transaction ID
   */
  resetTransactionId() {
    this._transactionID = 0;
    this.debug('Transaction ID reset to 0');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v5.5.740: Direct DP writing methods from PR #774 (arjendk)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Write boolean to datapoint
   * Source: PR #774 (arjendk)
   */
  async writeBool(dp, value) {
    const data = Buffer.alloc(1);
    data.writeUInt8(value ? 0x01 : 0x00, 0);
    return this._sendTuyaDatapoint(dp, 1, 1, data);
  }

  /**
   * Write 32-bit integer to datapoint
   * Source: PR #774 (arjendk)
   */
  async writeData32(dp, value) {
    const data = Buffer.alloc(4);
    data.writeUInt32BE(value, 0);
    return this._sendTuyaDatapoint(dp, 2, 4, data);
  }

  /**
   * Write string to datapoint
   * Source: PR #774 (arjendk)
   */
  async writeString(dp, value) {
    const data = Buffer.from(value, 'utf8');
    return this._sendTuyaDatapoint(dp, 3, data.length, data);
  }

  /**
   * Write enum to datapoint
   * Source: PR #774 (arjendk)
   */
  async writeEnum(dp, value) {
    const data = Buffer.alloc(1);
    data.writeUInt8(value, 0);
    return this._sendTuyaDatapoint(dp, 4, 1, data);
  }

  /**
   * Write bitmap to datapoint
   * Source: PR #774 (arjendk) - NEW METHOD
   */
  async writeBitmap(dp, value) {
    let data;
    if (Buffer.isBuffer(value)) {
      data = value;
    } else {
      data = Buffer.alloc(4);
      data.writeUInt32BE(value, 0);
    }
    return this._sendTuyaDatapoint(dp, 5, data.length, data);
  }

  /**
   * Write raw data to datapoint
   * Source: PR #774 (arjendk)
   */
  async writeRaw(dp, data) {
    if (!Buffer.isBuffer(data)) {
      throw new Error('Data must be a Buffer instance');
    }
    return this._sendTuyaDatapoint(dp, 0, data.length, data);
  }

  /**
   * Internal helper to send Tuya datapoint with retry logic
   * Source: PR #1204 (gpmachado) - Enhanced with input validation
   */
  async _sendTuyaDatapoint(dp, datatype, length, data, maxRetries = 2, baseDelay = 300) {
    // Input validation
    if (dp < 0 || dp > 255) {
      throw new Error(`Invalid datapoint ID: ${dp}. Must be between 0 and 255.`);
    }
    if (!Buffer.isBuffer(data)) {
      throw new Error('Data must be a Buffer instance');
    }

    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.debug(`Sending DP ${dp}, Datatype ${datatype}, Try ${attempt}/${maxRetries}`);

        if (!this.isDeviceReady()) {
          throw new Error('Tuya cluster not available or device not properly initialized');
        }

        const cluster = this.zclNode.endpoints[1].clusters.tuya || 
                       this.zclNode.endpoints[1].clusters.manuSpecificTuya;

        const response = await cluster.datapoint({
          status: 0,
          transid: this.transactionID++,
          dp,
          datatype,
          length,
          data
        });

        this.debug(`DP ${dp} sent successfully.`);
        return response;

      } catch (err) {
        lastError = err;
        this.error(`Error sending DP ${dp} (attempt ${attempt}/${maxRetries}): ${err.message}`);

        if (attempt < maxRetries) {
          const waitTime = baseDelay * attempt;
          this.debug(`Waiting ${waitTime}ms before retry ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw new Error(`Failed to send DP ${dp} after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Bulk command sending with delay
   * Source: PR #1204 (gpmachado) - For multiple DPs
   */
  async sendBulkCommands(commands, delayBetween = 100) {
    const results = [];
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      try {
        let result;
        switch (cmd.type) {
          case 'bool': result = await this.writeBool(cmd.dp, cmd.value); break;
          case 'enum': result = await this.writeEnum(cmd.dp, cmd.value); break;
          case 'data32': case 'value': result = await this.writeData32(cmd.dp, cmd.value); break;
          case 'string': result = await this.writeString(cmd.dp, cmd.value); break;
          case 'bitmap': result = await this.writeBitmap(cmd.dp, cmd.value); break;
          case 'raw': result = await this.writeRaw(cmd.dp, cmd.value); break;
          default: throw new Error(`Unknown command type: ${cmd.type}`);
        }
        results.push({ success: true, dp: cmd.dp, result });

        if (i < commands.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
      } catch (error) {
        results.push({ success: false, dp: cmd.dp, error: error.message });
        this.error(`Bulk command failed for DP ${cmd.dp}:`, error);
      }
    }
    return results;
  }
}

// v5.5.855: Apply PeriodicAutoEnricherMixin for dynamic capability detection
Object.assign(TuyaSpecificClusterDevice.prototype, PeriodicAutoEnricherMixin);

module.exports = TuyaSpecificClusterDevice;
