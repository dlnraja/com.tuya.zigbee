'use strict';

/**
 * ZigbeeClusterManager - Universal Cluster Handler for Homey
 *
 * Handles all standard ZCL clusters for direct Zigbee communication:
 * - IAS Zone (0x0500) - Security sensors
 * - IAS WD (0x0502) - Warning devices (sirens, strobes)
 * - Tuya Private (0xEF00) - Tuya DP protocol
 * - Standard clusters (OnOff, LevelCtrl, ColorControl, etc.)
 *
 * @author Dylan Rajasekaram
 * @version 1.0.0
 */

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

// =============================================================================
// CLUSTER CONSTANTS
// =============================================================================

const CLUSTERS = {
  // Standard ZCL Clusters
  BASIC: 0x0000,
  POWER_CFG: 0x0001,
  DEVICE_TEMP: 0x0002,
  IDENTIFY: 0x0003,
  GROUPS: 0x0004,
  SCENES: 0x0005,
  ON_OFF: 0x0006,
  ON_OFF_SWITCH_CFG: 0x0007,
  LEVEL_CTRL: 0x0008,
  ALARMS: 0x0009,
  TIME: 0x000A,
  ANALOG_INPUT: 0x000C,
  ANALOG_OUTPUT: 0x000D,
  ANALOG_VALUE: 0x000E,
  BINARY_INPUT: 0x000F,
  BINARY_OUTPUT: 0x0010,
  BINARY_VALUE: 0x0011,
  MULTISTATE_INPUT: 0x0012,
  MULTISTATE_OUTPUT: 0x0013,
  MULTISTATE_VALUE: 0x0014,
  OTA: 0x0019,
  POLL_CTRL: 0x0020,

  // Closures Clusters
  SHADE_CFG: 0x0100,
  DOOR_LOCK: 0x0101,
  WINDOW_COVERING: 0x0102,

  // HVAC Clusters
  PUMP_CFG: 0x0200,
  THERMOSTAT: 0x0201,
  FAN_CTRL: 0x0202,
  DEHUMIDIFICATION_CTRL: 0x0203,
  THERMOSTAT_UI_CFG: 0x0204,

  // Lighting Clusters
  COLOR_CTRL: 0x0300,
  BALLAST_CFG: 0x0301,

  // Measurement Clusters
  ILLUMINANCE_MEASUREMENT: 0x0400,
  ILLUMINANCE_LEVEL_SENSING: 0x0401,
  TEMPERATURE_MEASUREMENT: 0x0402,
  PRESSURE_MEASUREMENT: 0x0403,
  FLOW_MEASUREMENT: 0x0404,
  HUMIDITY_MEASUREMENT: 0x0405,
  OCCUPANCY_SENSING: 0x0406,

  // Security Clusters (IAS)
  IAS_ZONE: 0x0500,
  IAS_ACE: 0x0501,
  IAS_WD: 0x0502,

  // Smart Energy Clusters
  METERING: 0x0702,
  ELECTRICAL_MEASUREMENT: 0x0B04,

  // Tuya Private Cluster
  TUYA_PRIVATE: 0xEF00
};

// =============================================================================
// IAS ZONE TYPES
// =============================================================================

const IAS_ZONE_TYPES = {
  STANDARD_CIE: 0x0000,
  MOTION_SENSOR: 0x000D,
  CONTACT_SWITCH: 0x0015,
  FIRE_SENSOR: 0x0028,
  WATER_SENSOR: 0x002A,
  CO_SENSOR: 0x002B,
  PERSONAL_EMERGENCY: 0x002C,
  VIBRATION_SENSOR: 0x002D,
  REMOTE_CONTROL: 0x010F,
  KEY_FOB: 0x0115,
  KEYPAD: 0x021D,
  STANDARD_WARNING: 0x0225,
  GLASS_BREAK: 0x0226,
  SECURITY_REPEATER: 0x0229
};

// IAS Zone Status Bits
const IAS_ZONE_STATUS = {
  ALARM1: 0x0001,        // Bit 0: Zone alarm 1
  ALARM2: 0x0002,        // Bit 1: Zone alarm 2
  TAMPER: 0x0004,        // Bit 2: Tamper
  BATTERY_LOW: 0x0008,   // Bit 3: Battery low
  SUPERVISION: 0x0010,   // Bit 4: Supervision reports
  RESTORE: 0x0020,       // Bit 5: Restore reports
  TROUBLE: 0x0040,       // Bit 6: Trouble
  AC_MAINS: 0x0080,      // Bit 7: AC (mains)
  TEST: 0x0100,          // Bit 8: Test mode
  BATTERY_DEFECT: 0x0200 // Bit 9: Battery defect
};

// =============================================================================
// IAS WD (WARNING DEVICE) CONSTANTS
// =============================================================================

const IAS_WD_WARNING_MODE = {
  STOP: 0,
  BURGLAR: 1,
  FIRE: 2,
  EMERGENCY: 3,
  POLICE_PANIC: 4,
  FIRE_PANIC: 5,
  EMERGENCY_PANIC: 6
};

const IAS_WD_STROBE = {
  NO_STROBE: 0,
  USE_STROBE: 1
};

const IAS_WD_SIREN_LEVEL = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  VERY_HIGH: 3
};

const IAS_WD_SQUAWK_MODE = {
  ARMED: 0,
  DISARMED: 1
};

// =============================================================================
// TUYA DATAPOINT TYPES
// =============================================================================

const TUYA_DP_TYPE = {
  RAW: 0x00,
  BOOL: 0x01,
  VALUE: 0x02,    // 4 bytes, big endian
  STRING: 0x03,
  ENUM: 0x04,
  BITMAP: 0x05
};

// Common Tuya Datapoints
const TUYA_DP = {
  // Siren
  SIREN_SWITCH: 13,
  SIREN_VOLUME: 5,
  SIREN_DURATION: 7,
  SIREN_MELODY: 21,

  // Climate
  TEMPERATURE: 1,
  HUMIDITY: 2,
  BATTERY_PERCENT: 4,
  TEMP_UNIT: 9,

  // Motion
  OCCUPANCY: 1,
  SENSITIVITY: 2,
  KEEP_TIME: 102,

  // Contact
  CONTACT_STATE: 1,
  BATTERY_STATE: 3,

  // Water Leak
  WATER_LEAK: 1,

  // Switch
  SWITCH_1: 1,
  SWITCH_2: 2,
  SWITCH_3: 3,
  SWITCH_4: 4,

  // Dimmer
  DIMMER_SWITCH: 1,
  DIMMER_LEVEL: 2,
  DIMMER_MIN: 3,
  DIMMER_MAX: 4,

  // Curtain
  CURTAIN_SWITCH: 1,   // 0=open, 1=stop, 2=close
  CURTAIN_POSITION: 2,
  CURTAIN_ARRIVED: 3,
  CURTAIN_MODE: 4
};

// =============================================================================
// ZIGBEE CLUSTER MANAGER CLASS
// =============================================================================

class ZigbeeClusterManager {

  /**
   * Initialize cluster manager for a device
   * @param {ZigBeeDevice} device - Homey Zigbee device instance
   */
  constructor(device) {
    this.device = device;
    this.log = device.log.bind(device);
    this.error = device.error.bind(device);

    // Store registered listeners
    this._listeners = new Map();
  }

  // ===========================================================================
  // IAS ZONE (0x0500) - Security Sensors
  // ===========================================================================

  /**
   * Register IAS Zone cluster for security sensors
   * @param {Object} options - Configuration options
   */
  async registerIasZone(options = {}) {
    const {
      endpoint = 1,
      onAlarm = null,
      onTamper = null,
      onBatteryLow = null,
      autoEnroll = true
    } = options;

    try {
      const zclNode = this.device.zclNode;
      const iasZoneCluster = zclNode.endpoints[endpoint].clusters.iasZone;

      if (!iasZoneCluster) {
        this.log('IAS Zone cluster not available on endpoint', endpoint);
        return false;
      }

      // Auto-enroll if needed
      if (autoEnroll) {
        await this._enrollIasZone(iasZoneCluster);
      }

      // Register zone status change notification listener
      iasZoneCluster.on('zoneStatusChangeNotification', (payload) => {
        this._handleIasZoneStatus(payload, { onAlarm, onTamper, onBatteryLow });
      });

      // Also listen for attribute reports
      iasZoneCluster.on('attr.zoneStatus', (value) => {
        this._handleIasZoneStatus({ zoneStatus: value }, { onAlarm, onTamper, onBatteryLow });
      });

      this.log('IAS Zone registered on endpoint', endpoint);
      return true;
    } catch (err) {
      this.error('Failed to register IAS Zone:', err);
      return false;
    }
  }

  /**
   * Enroll device in IAS Zone
   */
  async _enrollIasZone(cluster) {
    try {
      // Write CIE address (Homey's IEEE address)
      const ieeeAddress = this.device.driver.homey.zigbee.address;
      if (ieeeAddress) {
        await cluster.writeAttributes({ iasCieAddr: ieeeAddress });
        this.log('IAS CIE address written:', ieeeAddress);
      }

      // Send enroll response
      await cluster.zoneEnrollResponse({
        enrollResponseCode: 0, // Success
        zoneId: 0x01
      });
      this.log('IAS Zone enrollment completed');
    } catch (err) {
      // Enrollment might already be done
      this.log('IAS Zone enrollment:', err.message);
    }
  }

  /**
   * Handle IAS Zone status changes
   */
  _handleIasZoneStatus(payload, callbacks) {
    const status = payload.zoneStatus || 0;

    // Parse status bits
    const alarm1 = !!(status & IAS_ZONE_STATUS.ALARM1);
    const alarm2 = !!(status & IAS_ZONE_STATUS.ALARM2);
    const tamper = !!(status & IAS_ZONE_STATUS.TAMPER);
    const batteryLow = !!(status & IAS_ZONE_STATUS.BATTERY_LOW);
    const trouble = !!(status & IAS_ZONE_STATUS.TROUBLE);

    this.log('IAS Zone status:', { alarm1, alarm2, tamper, batteryLow, trouble, raw: status });

    // Trigger callbacks
    if (callbacks.onAlarm && (alarm1 || alarm2)) {
      callbacks.onAlarm(alarm1, alarm2, status);
    }
    if (callbacks.onTamper && tamper) {
      callbacks.onTamper(tamper, status);
    }
    if (callbacks.onBatteryLow && batteryLow) {
      callbacks.onBatteryLow(batteryLow, status);
    }
  }

  /**
   * Get IAS Zone type
   */
  async getIasZoneType(endpoint = 1) {
    try {
      const cluster = this.device.zclNode.endpoints[endpoint].clusters.iasZone;
      const { zoneType } = await cluster.readAttributes(['zoneType']);
      return zoneType;
    } catch (err) {
      this.error('Failed to get zone type:', err);
      return null;
    }
  }

  // ===========================================================================
  // IAS WD (0x0502) - Warning Devices (Sirens, Strobes)
  // ===========================================================================

  /**
   * Register IAS WD cluster for sirens/strobes
   */
  async registerIasWd(options = {}) {
    const { endpoint = 1 } = options;

    try {
      const zclNode = this.device.zclNode;
      const iasWdCluster = zclNode.endpoints[endpoint].clusters.iasWd;

      if (!iasWdCluster) {
        this.log('IAS WD cluster not available on endpoint', endpoint);
        return false;
      }

      this._iasWdCluster = iasWdCluster;
      this._iasWdEndpoint = endpoint;

      this.log('IAS WD registered on endpoint', endpoint);
      return true;
    } catch (err) {
      this.error('Failed to register IAS WD:', err);
      return false;
    }
  }

  /**
   * Start warning (siren/strobe)
   * @param {Object} options - Warning options
   */
  async startWarning(options = {}) {
    const {
      mode = IAS_WD_WARNING_MODE.BURGLAR,
      strobe = IAS_WD_STROBE.USE_STROBE,
      sirenLevel = IAS_WD_SIREN_LEVEL.HIGH,
      duration = 30,  // seconds
      strobeDutyCycle = 50,  // percent
      strobeLevel = 1
    } = options;

    if (!this._iasWdCluster) {
      this.error('IAS WD cluster not registered');
      return false;
    }

    try {
      // Build warning info byte: [mode(4 bits)][strobe(2 bits)][siren level(2 bits)]
      const warningInfo = (mode & 0x0F) | ((strobe & 0x03) << 4) | ((sirenLevel & 0x03) << 6);

      await this._iasWdCluster.startWarning({
        warningInfo,
        warningDuration: duration,
        strobeDutyCycle,
        strobeLevel
      });

      this.log('Warning started:', { mode, strobe, sirenLevel, duration });
      return true;
    } catch (err) {
      this.error('Failed to start warning:', err);
      return false;
    }
  }

  /**
   * Stop warning
   */
  async stopWarning() {
    return this.startWarning({
      mode: IAS_WD_WARNING_MODE.STOP,
      strobe: IAS_WD_STROBE.NO_STROBE,
      sirenLevel: IAS_WD_SIREN_LEVEL.LOW,
      duration: 0
    });
  }

  /**
   * Squawk (short beep for arm/disarm feedback)
   */
  async squawk(options = {}) {
    const {
      mode = IAS_WD_SQUAWK_MODE.ARMED,
      strobe = IAS_WD_STROBE.USE_STROBE,
      level = IAS_WD_SIREN_LEVEL.MEDIUM
    } = options;

    if (!this._iasWdCluster) {
      this.error('IAS WD cluster not registered');
      return false;
    }

    try {
      // Build squawk info byte
      const squawkInfo = (mode & 0x0F) | ((strobe & 0x01) << 4) | ((level & 0x03) << 6);

      await this._iasWdCluster.squawk({ squawkInfo });
      this.log('Squawk sent:', { mode, strobe, level });
      return true;
    } catch (err) {
      this.error('Failed to squawk:', err);
      return false;
    }
  }

  // ===========================================================================
  // TUYA PRIVATE CLUSTER (0xEF00)
  // ===========================================================================

  /**
   * Register Tuya private cluster for DP protocol
   */
  async registerTuyaCluster(options = {}) {
    const { endpoint = 1, onDatapoint = null } = options;

    try {
      const zclNode = this.device.zclNode;

      // Tuya cluster might be named differently
      let tuyaCluster = zclNode.endpoints[endpoint].clusters['tuya'] ||
        zclNode.endpoints[endpoint].clusters[0xEF00] ||
        zclNode.endpoints[endpoint].clusters['manuSpecificTuya'];

      if (!tuyaCluster) {
        this.log('Tuya cluster not available, trying raw access');
        return false;
      }

      this._tuyaCluster = tuyaCluster;
      this._onDatapoint = onDatapoint;

      // Listen for datapoint reports
      tuyaCluster.on('response', (data) => {
        this._handleTuyaResponse(data);
      });

      tuyaCluster.on('reporting', (data) => {
        this._handleTuyaResponse(data);
      });

      this.log('Tuya cluster registered on endpoint', endpoint);
      return true;
    } catch (err) {
      this.error('Failed to register Tuya cluster:', err);
      return false;
    }
  }

  /**
   * Handle Tuya datapoint response
   */
  _handleTuyaResponse(data) {
    try {
      const datapoints = this._parseTuyaDatapoints(data);

      for (const dp of datapoints) {
        this.log('Tuya DP received:', dp);

        if (this._onDatapoint) {
          this._onDatapoint(dp.id, dp.value, dp.type);
        }
      }
    } catch (err) {
      this.error('Failed to parse Tuya response:', err);
    }
  }

  /**
   * Parse Tuya datapoints from raw data
   */
  _parseTuyaDatapoints(data) {
    const datapoints = [];

    if (!data || !Buffer.isBuffer(data)) {
      if (data && data.data) {
        data = Buffer.from(data.data);
      } else {
        return datapoints;
      }
    }

    let offset = 0;

    // Skip header if present (seq + cmd)
    if (data.length > 4 && data[0] === 0x00) {
      offset = 4;
    }

    while (offset < data.length - 4) {
      const dpId = data[offset];
      const dpType = data[offset + 1];
      const dpLen = (data[offset + 2] << 8) | data[offset + 3];

      if (offset + 4 + dpLen > data.length) break;

      const dpData = data.slice(offset + 4, offset + 4 + dpLen);
      let value;

      switch (dpType) {
        case TUYA_DP_TYPE.BOOL:
          value = dpData[0] === 1;
          break;
        case TUYA_DP_TYPE.VALUE:
          value = dpData.readInt32BE(0);
          break;
        case TUYA_DP_TYPE.ENUM:
          value = dpData[0];
          break;
        case TUYA_DP_TYPE.STRING:
          value = dpData.toString('utf8');
          break;
        case TUYA_DP_TYPE.BITMAP:
          value = dpLen === 1 ? dpData[0] :
            dpLen === 2 ? dpData.readUInt16BE(0) :
              dpData.readUInt32BE(0);
          break;
        default:
          value = dpData;
      }

      datapoints.push({ id: dpId, type: dpType, value, raw: dpData });
      offset += 4 + dpLen;
    }

    return datapoints;
  }

  /**
   * Send Tuya datapoint command
   */
  async sendTuyaDatapoint(dpId, dpType, value) {
    if (!this._tuyaCluster) {
      this.error('Tuya cluster not registered');
      return false;
    }

    try {
      // Build DP payload
      let dpData;
      let dpLen;

      switch (dpType) {
        case TUYA_DP_TYPE.BOOL:
          dpData = Buffer.from([value ? 1 : 0]);
          dpLen = 1;
          break;
        case TUYA_DP_TYPE.VALUE:
          dpData = Buffer.alloc(4);
          dpData.writeInt32BE(value, 0);
          dpLen = 4;
          break;
        case TUYA_DP_TYPE.ENUM:
          dpData = Buffer.from([value]);
          dpLen = 1;
          break;
        case TUYA_DP_TYPE.STRING:
          dpData = Buffer.from(value, 'utf8');
          dpLen = dpData.length;
          break;
        default:
          dpData = Buffer.isBuffer(value) ? value : Buffer.from([value]);
          dpLen = dpData.length;
      }

      // Build full command
      const seq = Math.floor(Math.random() * 65535);
      const cmd = Buffer.alloc(6 + dpLen);
      cmd.writeUInt16BE(seq, 0);
      cmd[2] = dpId;
      cmd[3] = dpType;
      cmd.writeUInt16BE(dpLen, 4);
      dpData.copy(cmd, 6);

      await this._tuyaCluster.datapoint({ data: cmd });
      this.log('Tuya DP sent:', { dpId, dpType, value });
      return true;
    } catch (err) {
      this.error('Failed to send Tuya DP:', err);
      return false;
    }
  }

  // ===========================================================================
  // CONVENIENCE METHODS FOR TUYA DEVICES
  // ===========================================================================

  /**
   * Control Tuya siren
   */
  async tuyaSirenControl(on, options = {}) {
    const { volume = 2, duration = 30, melody = 1 } = options;

    // Some sirens use DP 13 for on/off
    await this.sendTuyaDatapoint(TUYA_DP.SIREN_SWITCH, TUYA_DP_TYPE.BOOL, on);

    if (on) {
      // Set volume if supported
      await this.sendTuyaDatapoint(TUYA_DP.SIREN_VOLUME, TUYA_DP_TYPE.ENUM, volume);
      // Set duration if supported
      await this.sendTuyaDatapoint(TUYA_DP.SIREN_DURATION, TUYA_DP_TYPE.VALUE, duration);
    }

    return true;
  }

  /**
   * Control Tuya switch gang
   */
  async tuyaSwitchControl(gang, on) {
    const dpId = gang; // DP 1-4 for gangs 1-4
    return this.sendTuyaDatapoint(dpId, TUYA_DP_TYPE.BOOL, on);
  }

  /**
   * Control Tuya curtain
   */
  async tuyaCurtainControl(action, position = null) {
    // action: 0=open, 1=stop, 2=close
    await this.sendTuyaDatapoint(TUYA_DP.CURTAIN_SWITCH, TUYA_DP_TYPE.ENUM, action);

    if (position !== null && action !== 1) {
      await this.sendTuyaDatapoint(TUYA_DP.CURTAIN_POSITION, TUYA_DP_TYPE.VALUE, position);
    }

    return true;
  }

  // ===========================================================================
  // BATTERY MANAGEMENT
  // ===========================================================================

  /**
   * Register battery reporting
   */
  async registerBattery(options = {}) {
    const { endpoint = 1, useTuyaDP = false } = options;

    try {
      if (useTuyaDP) {
        // Battery via Tuya DP
        return true; // Handled in Tuya response
      }

      const zclNode = this.device.zclNode;
      const powerCfg = zclNode.endpoints[endpoint].clusters.genPowerCfg ||
        zclNode.endpoints[endpoint].clusters.powerConfiguration;

      if (!powerCfg) {
        this.log('Power configuration cluster not available');
        return false;
      }

      // Register battery percentage reporting
      powerCfg.on('attr.batteryPercentageRemaining', (value) => {
        const percent = Math.round(value / 2);
        this.device.setCapabilityValue('measure_battery', percent).catch(this.error);
        this.device.setCapabilityValue('alarm_battery', percent < 20).catch(this.error);
      });

      // Register battery voltage reporting
      powerCfg.on('attr.batteryVoltage', (value) => {
        const voltage = value / 10;
        this.log('Battery voltage:', voltage, 'V');
      });

      this.log('Battery reporting registered');
      return true;
    } catch (err) {
      this.error('Failed to register battery:', err);
      return false;
    }
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Get cluster instance
   */
  getCluster(clusterId, endpoint = 1) {
    try {
      return this.device.zclNode.endpoints[endpoint].clusters[clusterId];
    } catch (err) {
      return null;
    }
  }

  /**
   * Check if cluster is available
   */
  hasCluster(clusterId, endpoint = 1) {
    return this.getCluster(clusterId, endpoint) !== null;
  }

  /**
   * Read cluster attributes
   */
  async readAttributes(clusterId, attributes, endpoint = 1) {
    try {
      const cluster = this.getCluster(clusterId, endpoint);
      if (!cluster) return null;
      return await cluster.readAttributes(attributes);
    } catch (err) {
      this.error('Failed to read attributes:', err);
      return null;
    }
  }

  /**
   * Write cluster attributes
   */
  async writeAttributes(clusterId, attributes, endpoint = 1) {
    try {
      const cluster = this.getCluster(clusterId, endpoint);
      if (!cluster) return false;
      await cluster.writeAttributes(attributes);
      return true;
    } catch (err) {
      this.error('Failed to write attributes:', err);
      return false;
    }
  }

  /**
   * Configure attribute reporting
   */
  async configureReporting(clusterId, configs, endpoint = 1) {
    try {
      const cluster = this.getCluster(clusterId, endpoint);
      if (!cluster) return false;
      await cluster.configureReporting(configs);
      return true;
    } catch (err) {
      this.error('Failed to configure reporting:', err);
      return false;
    }
  }
}

// Export everything
module.exports = {
  ZigbeeClusterManager,
  CLUSTERS,
  IAS_ZONE_TYPES,
  IAS_ZONE_STATUS,
  IAS_WD_WARNING_MODE,
  IAS_WD_STROBE,
  IAS_WD_SIREN_LEVEL,
  IAS_WD_SQUAWK_MODE,
  TUYA_DP_TYPE,
  TUYA_DP
};
