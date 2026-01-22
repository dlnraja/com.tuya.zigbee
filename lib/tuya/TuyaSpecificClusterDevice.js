'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

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
  }

  /**
   * Setup Tuya manufacturer-specific cluster listener
   */
  setupTuyaCluster() {
    try {
      const tuyaCluster = this.zclNode.endpoints[1]?.clusters?.manuSpecificTuya;

      if (!tuyaCluster) {
        this.error('Tuya cluster not found on endpoint 1');
        return;
      }

      this.log('Setting up Tuya cluster listener...');

      // Listen for datapoint reports
      tuyaCluster.on('dataReport', (data) => {
        this.log('Tuya dataReport:', data);
        this.handleTuyaDataReport(data);
      });

      // Listen for raw data
      tuyaCluster.on('response', (data) => {
        this.log('Tuya response:', data);
        this.handleTuyaResponse(data);
      });

      this.log('✅ Tuya cluster listener configured');

    } catch (err) {
      this.error('Failed to setup Tuya cluster:', err);
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
      const tuyaCluster = this.zclNode.endpoints[1]?.clusters?.manuSpecificTuya;

      if (!tuyaCluster) {
        throw new Error('Tuya cluster not available');
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
   * Source: PR #1204 (gpmachado)
   */
  isDeviceReady() {
    return !!(this.zclNode &&
              this.zclNode.endpoints &&
              this.zclNode.endpoints[1] &&
              this.zclNode.endpoints[1].clusters &&
              (this.zclNode.endpoints[1].clusters.tuya || 
               this.zclNode.endpoints[1].clusters.manuSpecificTuya));
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

module.exports = TuyaSpecificClusterDevice;
