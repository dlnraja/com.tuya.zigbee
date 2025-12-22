'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * TuyaSpecificClusterDevice
 * Base class for Tuya devices using manufacturer-specific cluster (0xEF00 / 61184)
 * Handles Tuya Datapoint (DP) protocol
 */
class TuyaSpecificClusterDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.log('TuyaSpecificClusterDevice initializing...');

    // Store Tuya DP mappings
    this._tuyaDatapoints = new Map();

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
}

module.exports = TuyaSpecificClusterDevice;
