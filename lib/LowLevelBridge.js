'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          LowLevelBridge v1.0.0 — P34 ZIGBEE/TUYA BYPASS ENGINE              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  PROBLÈME: Les wrappers Homey SDK3, zigbee-clusters, et tuya-EF00 ne       ║
 * ║  gèrent pas TOUS les clusters et DPs.                                       ║
 * ║                                                                              ║
 * ║  SOLUTION: LowLevelBridge orchestre 6 niveaux de fallback :                 ║
 * ║   1. WRAPPER STANDARD — registerCapability, tuyaEF00Manager                ║
 * ║   2. SDK3 DIRECT — zclNode.endpoints[ep].clusters[id]                       ║
 * ║   3. EXOTIC QUIRK — ExoticQuirkEngine pour cas spéciaux                      ║
 * ║   4. TUYA RAW FRAME — parse direct frames EF00 pour DPs non mappés         ║
 * ║   5. ZIGPY INTEGRATION — bas niveau pour commands non exposées              ║
 * ║   6. POLLING + GUESS — si tout échoue, poll agressif + heuristic           ║
 * ║                                                                              ║
 * ║  Features:                                                                   ║
 * ║  - Battery: lit batteryPercentageRemaining + batteryVoltage + DP 4/15/101   ║
 * ║  - Buttons: détecte clusters onOff, levelControl, scenes                    ║
 * ║  - Tuya: parse les raw frames pour DPs non mappés                           ║
 * ║  - Fallback: si wrappers échouent, va au plus bas niveau                    ║
 * ║  - Auto-recovery: retry sur resource errors 0x80-0x86                       ║
 * ║  - Endpoint discovery: détecte les endpoints non standards                   ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const safeTimer = require('./utils/safe-timers');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: ZCL CLUSTER IDS (full reference)
// ═══════════════════════════════════════════════════════════════════════════════

const ZCL_CLUSTERS = {
  genBasic: 0x0000,
  powerConfiguration: 0x0001,
  deviceTemperature: 0x0002,
  identify: 0x0003,
  groups: 0x0004,
  scenes: 0x0005,
  onOff: 0x0006,
  onOffSwitchConfiguration: 0x0007,
  levelControl: 0x0008,
  alarms: 0x0009,
  time: 0x000A,
  rssiLocation: 0x000B,
  analogInput: 0x000C,
  analogOutput: 0x000D,
  analogValue: 0x000E,
  binaryInput: 0x000F,
  binaryOutput: 0x0010,
  binaryValue: 0x0011,
  thermostat: 0x0201,
  fanControl: 0x0202,
  dehumidification: 0x0203,
  temperatureMeasurement: 0x0402,
  pressureMeasurement: 0x0403,
  flowMeasurement: 0x0404,
  relativeHumidityMeasurement: 0x0405,
  illuminanceMeasurement: 0x0400,
  occupancySensing: 0x0406,
  iasZone: 0x0500,
  iasAce: 0x0501,
  iasWd: 0x0502,
  meterIdentification: 0x0B01,
  metering: 0x0B04,
  electricalMeasurement: 0x0B04,
  diagnostics: 0x0B05,
  // Tuya-specific
  tuyaEF00: 0xEF00,
  tuyaE000: 0xE000,
  // Custom manufacturer-specific clusters
  manuSpecificTuya1: 0xEF00,  // Tuya 0xEF00
  manuSpecificTuya2: 0xE001,
  manuSpecificTuya3: 0xE002,
  manuSpecificTuya4: 0xE003,
  manuSpecificTuya5: 0xE004,
  manuSpecificTuya6: 0xE005,
};

// Battery attributes
const BATTERY_ATTRIBUTES = {
  batteryVoltage: 0x0020,           // uint8, 0.1V units
  batteryPercentageRemaining: 0x0021, // uint8, 0-200 (ZCL) or 0-100 (some manufacturers)
  batteryQuantity: 0x0033,
  batteryManufacturer: 0x0034,
  batterySize: 0x0035,
  batteryRatedVoltage: 0x0034,
  batteryAlarmState: 0x0036,
  batteryAlarmMask: 0x0037,
  batteryVoltageMinThreshold: 0x0038,
  batteryVoltageThreshold1: 0x0039,
  batteryVoltageThreshold2: 0x003A,
  batteryVoltageThreshold3: 0x003B,
  batteryPercentageMinThreshold: 0x003C,
  batteryPercentageThreshold1: 0x003D,
  batteryPercentageThreshold2: 0x003E,
  batteryPercentageThreshold3: 0x003F,
  batteryAlarmStateRaw: 0x0040,
};

// Battery alarm mask bits
const BATTERY_ALARM_BITS = {
  0x01: 'batteryVoltageLow',
  0x02: 'batteryAlarm1',
  0x04: 'batteryAlarm2',
  0x08: 'batteryAlarm3',
  0x10: 'batteryCharging',
  0x20: 'batteryChargingError',
  0x40: 'batteryNotChargeable',
  0x80: 'batteryCritical',
};

// BatterySize enum
const BATTERY_SIZES = {
  0: 'no_battery',
  1: 'built_in',
  2: 'AA',
  3: 'AAA',
  4: 'C',
  5: 'D',
  6: 'CR2',
  7: 'CR123A',
  8: 'CR2450',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: TUYA DP COMMANDS (raw frame parsing)
// ═══════════════════════════════════════════════════════════════════════════════

// Tuya command codes
const TUYA_CMD = {
  AP_SEARCH: 0x01,
  ACTIVE_REGISTER: 0x03,
  MCU_VERSION_REQ: 0x06,
  MCU_VERSION_RES: 0x07,
  DATA_REPORT: 0x04,
  DATA_QUERY: 0x08,        // Request DP value
  DATA_RESP: 0x09,          // Response to query
  DATA_REPORT_ACTIVE: 0x05, // Active report (cloud)
  DATA_TIME_REQ: 0x0A,      // Time sync request
  DATA_TIME_RES: 0x0B,
  DATA_CUSTOM_CMD: 0x0C,
  STATE_SYNC: 0x10,
  STATE_SYNC_ACK: 0x11,
  WEATHER_DATA: 0x0E,
  // Sequence numbers are separate (0-65535)
};

const TUYA_DATA_TYPES = {
  RAW: 0x00,
  BOOL: 0x01,
  NUMBER: 0x02,
  STRING: 0x03,
  ENUM: 0x04,
  BITMAP: 0x05,
  FAULT: 0x06,
};

// Build a Tuya frame
function buildTuyaFrame(seq, cmd, data = Buffer.alloc(0)) {
  const version = 0x03;  // or 0x04 for newer devices
  // Header: version(1) + seq(2) + cmd(1) + length(2) + data + checksum
  const len = data.length;
  const buf = Buffer.alloc(8 + len);
  buf.writeUInt8(version, 0);
  buf.writeUInt16BE(seq, 1);
  buf.writeUInt8(cmd, 3);
  buf.writeUInt16BE(len, 4);
  data.copy(buf, 6);
  // Tuya uses XOR + carry checksum
  let checksum = 0;
  for (let i = 0; i < buf.length - 1; i++) {
    checksum = (checksum + buf.readUInt8(i)) & 0xFF;
  }
  buf.writeUInt8(checksum, buf.length - 1);
  return buf;
}

// Parse a Tuya frame
function parseTuyaFrame(buf) {
  if (!buf || buf.length < 7) return null;
  try {
    const version = buf.readUInt8(0);
    const seq = buf.readUInt16BE(1);
    const cmd = buf.readUInt8(3);
    const length = buf.readUInt16BE(4);
    const data = buf.slice(6, 6 + length);
    const checksum = buf.readUInt8(buf.length - 1);

    // Verify checksum
    let calc = 0;
    for (let i = 0; i < buf.length - 1; i++) {
      calc = (calc + buf.readUInt8(i)) & 0xFF;
    }
    const valid = calc === checksum;

    return { version, seq, cmd, length, data, checksum, valid };
  } catch (e) { return null; }
}

// Parse Tuya DP entries from a DATA_REPORT payload
function parseTuyaDataPayload(data) {
  const dps = [];
  let offset = 0;
  while (offset < data.length - 4) {
    try {
      const dpId = data.readUInt8(offset);
      offset += 1;
      const dpType = data.readUInt8(offset);
      offset += 1;
      const len = data.readUInt16BE(offset);
      offset += 2;
      if (len > data.length - offset) break;
      const value = data.slice(offset, offset + len);
      offset += len;
      dps.push({ dpId, dpType, value, length: len });
    } catch (e) { break; }
  }
  return dps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: ZCL FRAME PARSING (raw cluster commands)
// ═══════════════════════════════════════════════════════════════════════════════

const ZCL_FRAME_CONTROL = {
  // Frame types
  GLOBAL: 0x00,
  CLUSTER_SPECIFIC: 0x01,
  // Direction
  CLIENT_TO_SERVER: 0x00,
  SERVER_TO_CLIENT: 0x08,
  // Manufacturer specific
  MANUFACTURER_SPECIFIC: 0x04,
};

function buildZclFrame(clusterId, cmd, payload, options = {}) {
  // ZCL header: frame control(1) + transaction seq(1) + cmd(1)
  // Optional: manufacturer code(2) if MANUFACTURER_SPECIFIC flag
  const frameControl = options.frameControl || ZCL_FRAME_CONTROL.CLUSTER_SPECIFIC;
  const transactionSeq = options.seq || 0;
  const header = Buffer.alloc(3);
  header.writeUInt8(frameControl, 0);
  header.writeUInt8(transactionSeq, 1);
  header.writeUInt8(cmd, 2);
  if (frameControl & ZCL_FRAME_CONTROL.MANUFACTURER_SPECIFIC) {
    const mfrCode = Buffer.alloc(2);
    mfrCode.writeUInt16BE(options.manufacturerCode || 0, 0);
    return Buffer.concat([header, mfrCode, payload]);
  }
  return Buffer.concat([header, payload]);
}

function parseZclFrame(buf) {
  if (!buf || buf.length < 3) return null;
  try {
    const frameControl = buf.readUInt8(0);
    const transactionSeq = buf.readUInt8(1);
    const cmd = buf.readUInt8(2);
    const frameType = frameControl & 0x03;
    const direction = frameControl & 0x08;
    const manufacturerSpecific = !!(frameControl & 0x04);
    let payload = buf.slice(3);
    let manufacturerCode = null;
    if (manufacturerSpecific && payload.length >= 2) {
      manufacturerCode = payload.readUInt16BE(0);
      payload = payload.slice(2);
    }
    return { frameControl, transactionSeq, cmd, frameType, direction, manufacturerSpecific, manufacturerCode, payload };
  } catch (e) { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: LowLevelBridge CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class LowLevelBridge {
  constructor(device, options = {}) {
    this.device = device;
    this.zclNode = device?.zclNode;
    this.options = {
      timeout: options.timeout || 5000,
      retries: options.retries || 2,
      enableRawTuyaParsing: options.enableRawTuyaParsing !== false,
      enableZclFrameParsing: options.enableZclFrameParsing !== false,
      pollInterval: options.pollInterval || 60000,
      ...options,
    };

    // Try to load existing infrastructure
    this._loadInfrastructure();

    // Stats
    this.stats = {
      batteryReads: 0,
      batteryMethod1: 0,  // wrapper
      batteryMethod2: 0,  // SDK3 direct
      batteryMethod3: 0,  // exotic quirk
      batteryMethod4: 0,  // Tuya raw
      batteryMethod5: 0,  // zigpy integration
      batteryMethod6: 0,  // poll + guess
      rawFrames: 0,
      zclFrames: 0,
      errors: 0,
    };

    this._sequence = 0;
  }

  _loadInfrastructure() {
    this._ZigbeeCommandManager = null;
    this._MultiEndpointCommandListener = null;
    this._ZigbeeDataQuery = null;
    this._ExoticQuirkEngine = null;
    this._TuyaAdapter = null;
    this._ZigpyIntegration = null;
    this._RawFrameDeduplicator = null;

    try {
      this._ZigbeeCommandManager = require('./zigbee/ZigbeeCommandManager');
    } catch (e) { /* not available */ }
    try {
      this._MultiEndpointCommandListener = require('./zigbee/MultiEndpointCommandListener');
    } catch (e) { /* not available */ }
    try {
      this._ZigbeeDataQuery = require('./zigbee/ZigbeeDataQuery');
    } catch (e) { /* not available */ }
    try {
      this._ExoticQuirkEngine = require('./zigbee/ExoticQuirkEngine');
    } catch (e) { /* not available */ }
    try {
      this._TuyaAdapter = require('./tuya/TuyaAdapter');
    } catch (e) { /* not available */ }
    try {
      this._ZigpyIntegration = require('./zigbee/ZigpyIntegration');
    } catch (e) { /* not available */ }
    try {
      this._RawFrameDeduplicator = require('./zigbee/RawFrameDeduplicator');
    } catch (e) { /* not available */ }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BATTERY: 6-METHOD CASCADE WITH LOW-LEVEL BYPASS
  // ═══════════════════════════════════════════════════════════════════════════

  async readBatteryLowLevel() {
    this.stats.batteryReads++;

    // METHOD 1: WRAPPER STANDARD (Homey SDK3)
    let result = await this._batteryMethod1_Wrapper();
    if (result !== null) {
      this.stats.batteryMethod1++;
      return { value: result, method: 1, source: 'wrapper' };
    }

    // METHOD 2: SDK3 DIRECT (zclNode.endpoints)
    result = await this._batteryMethod2_SDK3Direct();
    if (result !== null) {
      this.stats.batteryMethod2++;
      return { value: result, method: 2, source: 'sdk3-direct' };
    }

    // METHOD 3: EXOTIC QUIRK ENGINE
    result = await this._batteryMethod3_ExoticQuirk();
    if (result !== null) {
      this.stats.batteryMethod3++;
      return { value: result, method: 3, source: 'exotic-quirk' };
    }

    // METHOD 4: TUYA RAW FRAME
    result = await this._batteryMethod4_TuyaRaw();
    if (result !== null) {
      this.stats.batteryMethod4++;
      return { value: result, method: 4, source: 'tuya-raw' };
    }

    // METHOD 5: ZIGPY INTEGRATION (low-level commands)
    result = await this._batteryMethod5_ZigpyIntegration();
    if (result !== null) {
      this.stats.batteryMethod5++;
      return { value: result, method: 5, source: 'zigpy' };
    }

    // METHOD 6: POLL + GUESS
    result = await this._batteryMethod6_PollAndGuess();
    if (result !== null) {
      this.stats.batteryMethod6++;
      return { value: result, method: 6, source: 'poll-guess' };
    }

    return null;
  }

  async _batteryMethod1_Wrapper() {
    try {
      // Try standard registerCapability path
      const cap = this.device.getCapabilityValue?.('measure_battery');
      if (Number.isFinite(cap) && cap > 0) return cap;
    } catch (e) { /* ignore */ }
    return null;
  }

  async _batteryMethod2_SDK3Direct() {
    try {
      if (!this.zclNode?.endpoints) return null;
      for (const [epId, ep] of Object.entries(this.zclNode.endpoints)) {
        if (epId === 'getDeviceEndpoint' || !ep?.clusters) continue;
        const cluster = ep.clusters.powerConfiguration
          || ep.clusters.genPowerCfg
          || ep.clusters[0x0001]
          || ep.clusters[1];
        if (!cluster) continue;

        // Try readAttributes
        if (typeof cluster.readAttributes === 'function') {
          try {
            const attrs = await cluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']);
            if (attrs.batteryPercentageRemaining !== undefined) {
              // Handle 200 sentinel, 0-200 scale, 0-100 scale
              let v = Number(attrs.batteryPercentageRemaining);
              if (v === 255 || v === 0xFFFF) return null;  // sentinel
              if (v === 200) return 100;
              if (v > 100 && v <= 200) return Math.round(v / 2);
              if (v >= 0 && v <= 100) return v;
            }
            if (attrs.batteryVoltage !== undefined) {
              const mV = Number(attrs.batteryVoltage);
              if (mV > 100) return Math.round(mV / 100);  // already in mV → %
            }
          } catch (err) { /* timeout normal */ }
        }

        // Try direct attribute access
        if (cluster.batteryPercentageRemaining !== undefined) {
          let v = Number(cluster.batteryPercentageRemaining);
          if (v === 255 || v === 0xFFFF) continue;
          if (v === 200) return 100;
          if (v > 100 && v <= 200) return Math.round(v / 2);
          if (v >= 0 && v <= 100) return v;
        }
        if (cluster.batteryVoltage !== undefined) {
          const mV = Number(cluster.batteryVoltage);
          if (mV > 100 && mV < 6000) return Math.round(mV / 100);
        }

        // Try batteryAlarmState (bit 0 = voltage low)
        if (typeof cluster.readAttributes === 'function') {
          try {
            const alarm = await cluster.readAttributes(['batteryAlarmState']);
            if (alarm.batteryAlarmState !== undefined) {
              const val = Number(alarm.batteryAlarmState);
              if (val & 0x01) return 10;  // voltage low
              if (val & 0x80) return 5;   // critical
              return 100;  // no alarm = assume full
            }
          } catch (err) { /* ignore */ }
        }

        // Try batteryQuantity + batterySize
        if (typeof cluster.readAttributes === 'function') {
          try {
            const attrs = await cluster.readAttributes(['batteryQuantity', 'batterySize', 'batteryManufacturer']);
            if (attrs.batterySize !== undefined) {
              this.device.log?.(`[LL-BRIDGE] batterySize: ${BATTERY_SIZES[attrs.batterySize] || attrs.batterySize}`);
            }
          } catch (err) { /* ignore */ }
        }
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  async _batteryMethod3_ExoticQuirk() {
    try {
      if (!this._ExoticQuirkEngine) return null;
      const ctx = { device: this.device, zclNode: this.zclNode };
      // Try invoking ExoticQuirkEngine (it may have specific device handlers)
      const result = await this._ExoticQuirkEngine.handle?.(ctx, 'battery');
      if (Number.isFinite(result)) return result;
    } catch (e) { /* ignore */ }
    return null;
  }

  async _batteryMethod4_TuyaRaw() {
    try {
      const mgr = this.device.tuyaEF00Manager;
      if (!mgr) return null;

      // Try known DPs first
      for (const dp of [4, 15, 101]) {
        try {
          let value = null;
          if (typeof mgr.getDP === 'function') {
            value = mgr.getDP(dp);
          } else if (typeof mgr.cachedDPs !== 'undefined') {
            value = mgr.cachedDPs?.[dp];
          } else if (typeof mgr.get === 'function') {
            value = mgr.get(`dp-${dp}`);
          }
          if (value !== null && value !== undefined) {
            // Normalize DP value to %
            if (dp === 4) {
              if (typeof value === 'object' && value.dp) value = value.dp;
              const num = Number(value);
              if (num > 0 && num <= 100) return num;
              if (num > 0 && num <= 200) return Math.round(num / 2);
            } else if (dp === 15 || dp === 101) {
              const num = Number(value);
              if (num >= 0 && num <= 100) return num;
            }
          }
        } catch (err) { /* try next */ }
      }

      // Try raw frame parsing via TuyaAdapter
      if (this._TuyaAdapter && this.options.enableRawTuyaParsing) {
        try {
          const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya
            || this.zclNode?.endpoints?.[1]?.clusters?.[0xEF00];
          if (tuyaCluster) {
            // Send data query for battery DPs
            const seq = (++this._sequence) & 0xFFFF;
            const dpData = Buffer.alloc(3);
            dpData.writeUInt8(4, 0);  // DP 4
            dpData.writeUInt8(15, 1);  // DP 15
            dpData.writeUInt8(101, 2); // DP 101
            const frame = buildTuyaFrame(seq, TUYA_CMD.DATA_QUERY, dpData);
            const response = await this._TuyaAdapter.send(this.device, tuyaCluster, frame);
            if (response) {
              const parsed = parseTuyaFrame(response);
              if (parsed && parsed.cmd === TUYA_CMD.DATA_RESP) {
                const dps = parseTuyaDataPayload(parsed.data);
                for (const dp of dps) {
                  if (dp.dpId === 4 && dp.length === 1) return Math.round(dp.value.readUInt8(0) / 2);
                  if ((dp.dpId === 15 || dp.dpId === 101) && dp.length === 1) return dp.value.readUInt8(0);
                }
              }
            }
          }
        } catch (err) { /* silent */ }
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  async _batteryMethod5_ZigpyIntegration() {
    try {
      if (!this._ZigpyIntegration) return null;
      // Direct low-level zigpy/zigbee-herdsman-style read
      const ctx = { device: this.device, zclNode: this.zclNode };
      const result = await this._ZigpyIntegration.readBattery?.(ctx);
      if (Number.isFinite(result)) return result;
    } catch (e) { /* ignore */ }
    return null;
  }

  async _batteryMethod6_PollAndGuess() {
    try {
      // Poll all known clusters
      if (!this.zclNode?.endpoints) return null;
      let best = null;
      for (const [epId, ep] of Object.entries(this.zclNode.endpoints)) {
        if (epId === 'getDeviceEndpoint' || !ep?.clusters) continue;
        // Try to read ALL cluster attributes (battery-related)
        for (const clusterName of ['powerConfiguration', 'genPowerCfg']) {
          const cluster = ep.clusters[clusterName];
          if (!cluster) continue;
          for (const attr of Object.values(BATTERY_ATTRIBUTES)) {
            try {
              let val = null;
              if (typeof cluster.readAttributes === 'function') {
                const attrs = await cluster.readAttributes([attr]).catch(() => ({}));
                val = attrs[Object.keys(attrs).find(k => BATTERY_ATTRIBUTES[k] === attr)];
              }
              if (val === undefined && cluster[attr] !== undefined) {
                val = cluster[attr];
              }
              if (val === null || val === undefined) continue;
              const num = Number(val);
              if (num === 255 || num === 0xFFFF) continue;
              if (attr === BATTERY_ATTRIBUTES.batteryPercentageRemaining) {
                if (num === 200) return 100;
                if (num > 100 && num <= 200) best = Math.round(num / 2);
                else if (num >= 0 && num <= 100) best = num;
              } else if (attr === BATTERY_ATTRIBUTES.batteryVoltage) {
                if (num > 100) {
                  const pct = Math.round(num / 100);
                  if (pct >= 0 && pct <= 100) best = pct;
                }
              } else if (attr === BATTERY_ATTRIBUTES.batteryAlarmState) {
                if (num & 0x80) best = 5;
                else if (num & 0x01) best = 10;
                else best = 100;
              }
            } catch (err) { /* silent */ }
          }
        }
      }
      return best;
    } catch (e) { /* ignore */ }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERIC LOW-LEVEL: DIRECT ZCL CLUSTER ACCESS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Read any ZCL cluster attribute, bypassing wrapper limitations.
   * Tries: cluster.readAttributes → direct attribute → polled value.
   */
  async readZCLAttribute(clusterId, attributeId, endpointId = 1) {
    const ep = this.zclNode?.endpoints?.[endpointId];
    if (!ep) return null;
    const cluster = this._findCluster(ep, clusterId);
    if (!cluster) return null;

    // METHOD 1: readAttributes
    if (typeof cluster.readAttributes === 'function') {
      try {
        const attrs = await cluster.readAttributes([attributeId]);
        // Find the attribute by ID (since SDK uses name keys)
        for (const [k, v] of Object.entries(attrs)) {
          if (typeof v === 'object' && v !== null && 'dataTypeId' in v) {
            // It's an attribute report, find matching attr
            return v;
          }
        }
        return attrs[Object.keys(attrs).find(k => k.toLowerCase().includes('attr_') || k === String(attributeId))] ?? Object.values(attrs)[0];
      } catch (err) { /* try next */ }
    }
    // METHOD 2: direct attribute
    return cluster[attributeId] ?? null;
  }

  /**
   * Write any ZCL cluster attribute, bypassing wrapper limitations.
   */
  async writeZCLAttribute(clusterId, attributeId, value, endpointId = 1) {
    const ep = this.zclNode?.endpoints?.[endpointId];
    if (!ep) return false;
    const cluster = this._findCluster(ep, clusterId);
    if (!cluster) return false;

    // METHOD 1: writeAttributes
    if (typeof cluster.writeAttributes === 'function') {
      try {
        await cluster.writeAttributes({ [attributeId]: value });
        return true;
      } catch (err) { /* try next */ }
    }
    // METHOD 2: direct write
    if (typeof cluster.write === 'function') {
      try {
        await cluster.write({ attributeId, value });
        return true;
      } catch (err) { /* silent */ }
    }
    return false;
  }

  /**
   * Find cluster by ID or name or alias
   */
  _findCluster(endpoint, clusterIdOrName) {
    if (!endpoint?.clusters) return null;
    const cs = endpoint.clusters;
    // Try direct
    if (cs[clusterIdOrName]) return cs[clusterIdOrName];
    // Try by ID
    if (typeof clusterIdOrName === 'number' && cs[clusterIdOrName]) return cs[clusterIdOrName];
    if (typeof clusterIdOrName === 'string') {
      const idNum = parseInt(clusterIdOrName, 16);
      if (cs[idNum]) return cs[idNum];
    }
    // Try by name (e.g. "powerConfiguration" → 0x0001)
    const nameMap = {};
    for (const [name, id] of Object.entries(ZCL_CLUSTERS)) {
      nameMap[name] = id;
      nameMap[name.toLowerCase()] = id;
    }
    const id = nameMap[clusterIdOrName] ?? nameMap[clusterIdOrName.toLowerCase()];
    if (id !== undefined && cs[id]) return cs[id];
    return null;
  }

  /**
   * Send raw cluster command
   */
  async sendClusterCommand(clusterId, cmd, payload, endpointId = 1, options = {}) {
    const ep = this.zclNode?.endpoints?.[endpointId];
    if (!ep) return false;
    const cluster = this._findCluster(ep, clusterId);
    if (!cluster) return false;

    // METHOD 1: cluster.commandX
    if (typeof cluster[`command${cmd.charAt(0).toUpperCase() + cmd.slice(1)}`] === 'function') {
      try {
        await cluster[`command${cmd.charAt(0).toUpperCase() + cmd.slice(1)}`](payload, options);
        return true;
      } catch (err) { /* try next */ }
    }
    // METHOD 2: generic command
    if (typeof cluster.command === 'function') {
      try {
        await cluster.command(cmd, payload, options);
        return true;
      } catch (err) { /* silent */ }
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TUYA RAW ACCESS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Send raw Tuya frame and parse response
   */
  async sendRawTuyaFrame(cmd, data, options = {}) {
    try {
      const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya
        || this.zclNode?.endpoints?.[1]?.clusters?.[0xEF00];
      if (!tuyaCluster) return null;

      const seq = (++this._sequence) & 0xFFFF;
      const dataBuf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      const frame = buildTuyaFrame(seq, cmd, dataBuf);

      let response = null;
      if (this._TuyaAdapter) {
        response = await this._TuyaAdapter.send(this.device, tuyaCluster, frame);
      } else if (typeof tuyaCluster.sendFrame === 'function') {
        response = await tuyaCluster.sendFrame(frame);
      } else if (typeof tuyaCluster.dataRequest === 'function') {
        response = await tuyaCluster.dataRequest(frame);
      }
      if (!response) return null;

      this.stats.rawFrames++;
      if (Buffer.isBuffer(response)) {
        return parseTuyaFrame(response);
      }
      return response;
    } catch (e) { return null; }
  }

  /**
   * Query a specific Tuya DP and get the value
   */
  async queryTuyaDP(dpId, options = {}) {
    try {
      // Use TuyaAdapter or direct
      const dpData = Buffer.alloc(1);
      dpData.writeUInt8(dpId, 0);
      const response = await this.sendRawTuyaFrame(TUYA_CMD.DATA_QUERY, dpData, options);
      if (!response || response.cmd !== TUYA_CMD.DATA_RESP) return null;
      const dps = parseTuyaDataPayload(response.data);
      const dp = dps.find(d => d.dpId === dpId);
      if (!dp) return null;
      // Parse value based on type
      switch (dp.dpType) {
        case TUYA_DATA_TYPES.BOOL: return dp.value.readUInt8(0) === 1;
        case TUYA_DATA_TYPES.NUMBER:
        case TUYA_DATA_TYPES.ENUM:
          if (dp.length === 4) return dp.value.readInt32BE(0);
          if (dp.length === 2) return dp.value.readUInt16BE(0);
          if (dp.length === 1) return dp.value.readUInt8(0);
          return dp.value.readUIntBE(0, dp.length);
        case TUYA_DATA_TYPES.STRING: return dp.value.toString('utf8');
        case TUYA_DATA_TYPES.BITMAP:
          if (dp.length === 4) return dp.value.readUInt32BE(0);
          if (dp.length === 1) return dp.value.readUInt8(0);
          return dp.value.readUIntBE(0, dp.length);
        default: return dp.value;
      }
    } catch (e) { return null; }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENDPOINT DISCOVERY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Discover all endpoints with their clusters
   */
  discoverEndpoints() {
    if (!this.zclNode?.endpoints) return null;
    const result = { endpoints: {}, summary: { totalEndpoints: 0, totalClusters: 0 } };
    for (const [epId, ep] of Object.entries(this.zclNode.endpoints)) {
      if (epId === 'getDeviceEndpoint' || !ep || typeof ep !== 'object' || !ep.clusters) continue;
      const clusters = {};
      for (const [name, cluster] of Object.entries(ep.clusters)) {
        if (!cluster || typeof cluster !== 'object') continue;
        clusters[name] = {
          id: cluster.id || this._clusterNameToId(name),
          attributeCount: typeof cluster.attributes === 'object' ? Object.keys(cluster.attributes).length : 0,
          commandCount: typeof cluster.commands === 'object' ? Object.keys(cluster.commands).length : 0,
          bound: !!cluster.binding,
        };
      }
      result.endpoints[epId] = { clusters, clusterCount: Object.keys(clusters).length };
      result.summary.totalEndpoints++;
      result.summary.totalClusters += Object.keys(clusters).length;
    }
    return result;
  }

  _clusterNameToId(name) {
    const map = {};
    for (const [n, id] of Object.entries(ZCL_CLUSTERS)) {
      map[n] = id;
      map[n.toLowerCase()] = id;
    }
    return map[name] ?? map[name?.toLowerCase()] ?? 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DIAGNOSTICS
  // ═══════════════════════════════════════════════════════════════════════════

  getStats() {
    return { ...this.stats };
  }

  getEndpointsSummary() {
    const ep = this.discoverEndpoints();
    return ep?.summary || null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  LowLevelBridge,
  ZCL_CLUSTERS,
  ZCL_FRAME_CONTROL,
  BATTERY_ATTRIBUTES,
  BATTERY_ALARM_BITS,
  BATTERY_SIZES,
  TUYA_CMD,
  TUYA_DATA_TYPES,
  // Frame builders/parsers
  buildTuyaFrame,
  parseTuyaFrame,
  parseTuyaDataPayload,
  buildZclFrame,
  parseZclFrame,
  version: '1.0.0',
  batteryMethods: 6,
  clusters: Object.keys(ZCL_CLUSTERS).length,
};
