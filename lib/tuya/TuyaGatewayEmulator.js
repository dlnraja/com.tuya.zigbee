'use strict';

/**
 * TuyaGatewayEmulator - v5.5.29 Gateway Emulation for Homey
 *
 * Emulates a Tuya Zigbee Gateway to provide:
 * - Time broadcast to devices with clocks/displays
 * - Time request handling (mcuSyncTime)
 * - Device announce time push
 * - Periodic time broadcast
 *
 * WHY THIS IS NEEDED:
 * Tuya devices with displays (like _TZE284_vvmbj46n climate monitor) expect
 * the Zigbee coordinator to act as a gateway and push time periodically.
 * Without this, the device shows wrong time or no time at all.
 *
 * Sources:
 * - Z2M: tuya.ts - handleMcuSyncTime()
 * - ZHA: tuya.py - TuyaTimeCluster
 * - Tuya Developer: TS0601 time protocol
 *
 * Protocol:
 * - Command 0x24 (36): mcuSyncTime request FROM device
 * - Command 0x64 (100): Time response TO device
 * - Payload: UTC(4 bytes) + LocalTime(4 bytes)
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TUYA_CLUSTER_ID = 0xEF00; // 61184
const ZIGBEE_EPOCH = new Date(Date.UTC(2000, 0, 1, 0, 0, 0)).getTime();

// Tuya time commands
const TUYA_CMD_TIME_REQUEST = 0x24;  // 36 - Device requests time
const TUYA_CMD_TIME_RESPONSE = 0x64; // 100 - Gateway sends time
const TUYA_CMD_MCU_SYNC = 0x28;      // 40 - Alternative time sync

// Time broadcast interval (6 hours)
const TIME_BROADCAST_INTERVAL = 6 * 60 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════
// TIME CALCULATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get seconds since Zigbee epoch (2000-01-01 00:00:00 UTC)
 */
function getZigbeeTimeUTC() {
  return Math.floor((Date.now() - ZIGBEE_EPOCH) / 1000);
}

/**
 * Get local time as seconds since Zigbee epoch
 */
function getZigbeeTimeLocal() {
  const now = new Date();
  const utcSeconds = getZigbeeTimeUTC();
  const offsetSeconds = -now.getTimezoneOffset() * 60;
  return utcSeconds + offsetSeconds;
}

/**
 * Build Tuya time payload (8 bytes)
 * Format: UTC(4 bytes BE) + LocalTime(4 bytes BE)
 */
function buildTimePayload() {
  const utc = getZigbeeTimeUTC();
  const local = getZigbeeTimeLocal();

  const payload = Buffer.alloc(8);
  payload.writeUInt32BE(utc, 0);
  payload.writeUInt32BE(local, 4);

  return payload;
}

/**
 * Build extended time payload (with timezone info)
 * Format: UTC(4) + Local(4) + TZOffset(4) + Year(2) + Month(1) + Day(1) + Hour(1) + Min(1) + Sec(1)
 */
function buildExtendedTimePayload() {
  const now = new Date();
  const utc = getZigbeeTimeUTC();
  const local = getZigbeeTimeLocal();
  const tzOffset = -now.getTimezoneOffset() * 60;

  const payload = Buffer.alloc(17);
  let offset = 0;

  // Basic time
  payload.writeUInt32BE(utc, offset); offset += 4;
  payload.writeUInt32BE(local, offset); offset += 4;
  payload.writeInt32BE(tzOffset, offset); offset += 4;

  // Date/time components
  payload.writeUInt16BE(now.getFullYear(), offset); offset += 2;
  payload.writeUInt8(now.getMonth() + 1, offset); offset += 1;
  payload.writeUInt8(now.getDate(), offset); offset += 1;
  payload.writeUInt8(now.getHours(), offset); offset += 1;
  payload.writeUInt8(now.getMinutes(), offset); offset += 1;

  return payload;
}

// ═══════════════════════════════════════════════════════════════════════════
// GATEWAY EMULATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════

class TuyaGatewayEmulator {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      broadcastInterval: options.broadcastInterval || TIME_BROADCAST_INTERVAL,
      autoStart: options.autoStart !== false,
      verbose: options.verbose || false,
      ...options,
    };

    this._broadcastTimer = null;
    this._timeRequestHandler = null;
    this._initialized = false;
  }

  log(msg) {
    if (this.options.verbose) {
      this.device.log?.(`[GATEWAY-EMU] ${msg}`) || console.log(`[GATEWAY-EMU] ${msg}`);
    }
  }

  /**
   * Initialize gateway emulation
   */
  async initialize() {
    if (this._initialized) return;
    this._initialized = true;

    this.log('Initializing Tuya Gateway Emulation...');

    // Setup time request handler
    await this._setupTimeRequestHandler();

    // Initial time push
    await this.pushTime().catch(e => this.log(`Initial time push failed: ${e.message}`));

    // Start periodic broadcast
    if (this.options.autoStart) {
      this.startBroadcast();
    }

    this.log('✅ Gateway emulation initialized');
  }

  /**
   * Setup handler for time requests from device
   * Devices send cmd 0x24 when they need time
   */
  async _setupTimeRequestHandler() {
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      if (!endpoint) return;

      // Find Tuya cluster
      const tuyaCluster = endpoint.clusters?.tuya
        || endpoint.clusters?.manuSpecificTuya
        || endpoint.clusters?.[TUYA_CLUSTER_ID]
        || endpoint.clusters?.['61184'];

      if (!tuyaCluster) {
        this.log('No Tuya cluster found');
        return;
      }

      // Listen for time request commands
      if (typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('response', async (cmd, payload) => {
          if (cmd === TUYA_CMD_TIME_REQUEST || cmd === TUYA_CMD_MCU_SYNC) {
            this.log(`📥 Time request received (cmd=${cmd})`);
            await this.pushTime();
          }
        });

        // Also listen for raw frames
        tuyaCluster.on('frame', async (frame) => {
          if (frame?.cmd === TUYA_CMD_TIME_REQUEST || frame?.commandId === TUYA_CMD_TIME_REQUEST) {
            this.log('📥 Time request frame received');
            await this.pushTime();
          }
        });
      }

      // Try to register for mcuSyncTime command specifically
      if (typeof tuyaCluster.onMcuSyncTime === 'undefined') {
        tuyaCluster.onMcuSyncTime = async () => {
          this.log('📥 mcuSyncTime command received');
          await this.pushTime();
        };
      }

      this.log('✅ Time request handler configured');
    } catch (err) {
      this.log(`Time request handler setup failed: ${err.message}`);
    }
  }

  /**
   * Push time to device (main method)
   */
  async pushTime() {
    this.log('📤 Pushing time to device...');

    const results = {
      tuyaEF00: false,
      zclTime: false,
      raw: false,
    };

    // Method 1: Via TuyaEF00Manager
    results.tuyaEF00 = await this._pushViaTuyaManager();

    // Method 2: Via ZCL Time cluster
    results.zclTime = await this._pushViaZCLTime();

    // Method 3: Via raw Tuya command
    if (!results.tuyaEF00 && !results.zclTime) {
      results.raw = await this._pushViaRawCommand();
    }

    const success = results.tuyaEF00 || results.zclTime || results.raw;
    this.log(`Time push result: ${success ? '✅' : '⚠️'} (EF00=${results.tuyaEF00}, ZCL=${results.zclTime}, Raw=${results.raw})`);

    return success;
  }

  /**
   * Push time via TuyaEF00Manager
   */
  async _pushViaTuyaManager() {
    try {
      const manager = this.device.tuyaEF00Manager;
      if (!manager) return false;

      const payload = buildTimePayload();

      // Try different methods
      if (typeof manager.sendTimeSync === 'function') {
        await manager.sendTimeSync(payload);
        return true;
      }

      if (typeof manager.sendCommand === 'function') {
        await manager.sendCommand(TUYA_CMD_TIME_RESPONSE, payload);
        return true;
      }

      if (typeof manager.sendRaw === 'function') {
        const frame = Buffer.concat([
          Buffer.from([0x00, Date.now() % 256, TUYA_CMD_TIME_RESPONSE]),
          payload
        ]);
        await manager.sendRaw(frame);
        return true;
      }

      return false;
    } catch (err) {
      this.log(`TuyaManager time push failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Push time via ZCL Time cluster
   */
  async _pushViaZCLTime() {
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      const timeCluster = endpoint?.clusters?.time || endpoint?.clusters?.genTime;

      if (!timeCluster) return false;

      const now = new Date();
      const utcSeconds = getZigbeeTimeUTC();
      const tzOffsetSeconds = -now.getTimezoneOffset() * 60;

      await timeCluster.writeAttributes({
        time: utcSeconds,
        localTime: utcSeconds + tzOffsetSeconds,
        timeZone: tzOffsetSeconds,
      });

      return true;
    } catch (err) {
      this.log(`ZCL time push failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Push time via raw Tuya command
   */
  async _pushViaRawCommand() {
    try {
      const endpoint = this.device.zclNode?.endpoints?.[1];
      const tuyaCluster = endpoint?.clusters?.tuya
        || endpoint?.clusters?.manuSpecificTuya
        || endpoint?.clusters?.[TUYA_CLUSTER_ID];

      if (!tuyaCluster || typeof tuyaCluster.command !== 'function') return false;

      const payload = buildTimePayload();

      // Try time response command
      try {
        await tuyaCluster.command('mcuSyncTime', {
          payloadSize: payload.length,
          payload: payload,
        }, { disableDefaultResponse: true });
        return true;
      } catch (e) {
        // Try alternative command names
        const commands = ['timeResponse', 'timeSyncResponse', 'setTime'];
        for (const cmd of commands) {
          try {
            await tuyaCluster.command(cmd, { payload }, { disableDefaultResponse: true });
            return true;
          } catch (e2) {
            // Continue
          }
        }
      }

      return false;
    } catch (err) {
      this.log(`Raw time push failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Start periodic time broadcast
   */
  startBroadcast() {
    this.stopBroadcast();

    this._broadcastTimer = setInterval(() => {
      this.pushTime().catch(e => this.log(`Periodic time push failed: ${e.message}`));
    }, this.options.broadcastInterval);

    this.log(`⏰ Time broadcast started (every ${this.options.broadcastInterval / 3600000}h)`);
  }

  /**
   * Stop periodic time broadcast
   */
  stopBroadcast() {
    if (this._broadcastTimer) {
      clearInterval(this._broadcastTimer);
      this._broadcastTimer = null;
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopBroadcast();
    this._initialized = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEVICE WAKE STRATEGIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Advanced wake strategies for sleepy Tuya devices
 * These methods try different approaches to wake devices and get data
 */
const WakeStrategies = {
  /**
   * Strategy 1: Device Announce listener
   * When device rejoins network, it's awake - query immediately
   */
  async onDeviceAnnounce(device, callback) {
    try {
      const node = device.zclNode?.node;
      if (node && typeof node.on === 'function') {
        node.on('deviceAnnounce', async () => {
          device.log?.('[WAKE] 📢 Device announce received - device is awake!');
          await callback?.();
        });
        return true;
      }
    } catch (e) {
      device.log?.(`[WAKE] Device announce setup failed: ${e.message}`);
    }
    return false;
  },

  /**
   * Strategy 2: Attribute report listener with immediate query
   * When we receive ANY data, query all DPs while device is awake
   */
  async onAnyDataReceived(device, dpIds, callback) {
    try {
      // Track last query time to avoid spamming
      let lastQueryTime = 0;
      const minInterval = 5000; // 5 seconds minimum between queries

      const queryIfReady = async () => {
        const now = Date.now();
        if (now - lastQueryTime < minInterval) return;
        lastQueryTime = now;

        // v5.5.69: CRITICAL - Update activity timestamp BEFORE calling safeTuyaDataQuery
        // This ensures the device is seen as "recently active" when the query runs
        device._lastRadioActivity = now;
        device._lastEventTime = now;

        device.log?.('[WAKE] 📡 Data received - querying all DPs while awake');
        await callback?.(dpIds);
      };

      // Hook into various data sources
      if (device.tuyaEF00Manager) {
        device.tuyaEF00Manager.on?.('dpReport', queryIfReady);
      }

      if (device.universalDataHandler) {
        device.universalDataHandler.on?.('dp', queryIfReady);
        device.universalDataHandler.on?.('zcl', queryIfReady);
      }

      return true;
    } catch (e) {
      device.log?.(`[WAKE] Data listener setup failed: ${e.message}`);
    }
    return false;
  },

  /**
   * Strategy 3: Binding refresh
   * Re-bind clusters to ensure device reports to us
   */
  async refreshBindings(device) {
    try {
      const endpoint = device.zclNode?.endpoints?.[1];
      if (!endpoint) return false;

      device.log?.('[WAKE] 🔗 Refreshing cluster bindings...');

      const clustersToRebind = [
        'temperatureMeasurement',
        'relativeHumidityMeasurement',
        'powerConfiguration',
        'msTemperatureMeasurement',
        'msRelativeHumidity',
      ];

      for (const clusterName of clustersToRebind) {
        const cluster = endpoint.clusters?.[clusterName];
        if (cluster && typeof cluster.bind === 'function') {
          try {
            await cluster.bind();
            device.log?.(`[WAKE] ✅ Bound ${clusterName}`);
          } catch (e) {
            // Silent fail
          }
        }
      }

      return true;
    } catch (e) {
      device.log?.(`[WAKE] Binding refresh failed: ${e.message}`);
    }
    return false;
  },

  /**
   * Strategy 4: Configure reporting
   * Set up attribute reporting to get automatic updates
   */
  async configureReporting(device) {
    try {
      device.log?.('[WAKE] 📊 Configuring attribute reporting...');

      const reports = [
        {
          endpointId: 1,
          cluster: 'temperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 10, // 0.1°C
        },
        {
          endpointId: 1,
          cluster: 'relativeHumidityMeasurement',
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 100, // 1%
        },
        {
          endpointId: 1,
          cluster: 'powerConfiguration',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        },
      ];

      if (typeof device.configureAttributeReporting === 'function') {
        await device.configureAttributeReporting(reports).catch(() => { });
        device.log?.('[WAKE] ✅ Attribute reporting configured');
        return true;
      }
    } catch (e) {
      device.log?.(`[WAKE] Reporting config failed: ${e.message}`);
    }
    return false;
  },

  /**
   * Strategy 5: Read attributes (for router devices)
   * Direct read - only works if device is awake or router
   */
  async readAttributes(device) {
    try {
      const endpoint = device.zclNode?.endpoints?.[1];
      if (!endpoint) return false;

      device.log?.('[WAKE] 📖 Reading attributes directly...');

      const reads = [];

      // Temperature
      const tempCluster = endpoint.clusters?.temperatureMeasurement;
      if (tempCluster) {
        reads.push(
          tempCluster.readAttributes?.(['measuredValue'])
            .then(data => {
              if (data?.measuredValue != null) {
                const temp = data.measuredValue / 100;
                device.log?.(`[WAKE] 🌡️ Temperature: ${temp}°C`);
                device.setCapabilityValue?.('measure_temperature', temp).catch(() => { });
              }
            })
            .catch(() => { })
        );
      }

      // Humidity
      const humCluster = endpoint.clusters?.relativeHumidityMeasurement;
      if (humCluster) {
        reads.push(
          humCluster.readAttributes?.(['measuredValue'])
            .then(data => {
              if (data?.measuredValue != null) {
                const hum = data.measuredValue / 100;
                device.log?.(`[WAKE] 💧 Humidity: ${hum}%`);
                device.setCapabilityValue?.('measure_humidity', hum).catch(() => { });
              }
            })
            .catch(() => { })
        );
      }

      // Battery
      const powerCluster = endpoint.clusters?.powerConfiguration;
      if (powerCluster) {
        reads.push(
          powerCluster.readAttributes?.(['batteryPercentageRemaining'])
            .then(data => {
              if (data?.batteryPercentageRemaining != null) {
                const bat = Math.round(data.batteryPercentageRemaining / 2);
                device.log?.(`[WAKE] 🔋 Battery: ${bat}%`);
                device.setCapabilityValue?.('measure_battery', bat).catch(() => { });
              }
            })
            .catch(() => { })
        );
      }

      await Promise.all(reads);
      return true;
    } catch (e) {
      device.log?.(`[WAKE] Attribute read failed: ${e.message}`);
    }
    return false;
  },

  /**
   * Strategy 6: Tuya DP query burst
   * Send multiple DP queries in rapid succession
   */
  async dpQueryBurst(device, dpIds) {
    try {
      device.log?.(`[WAKE] 💥 DP query burst: [${dpIds.join(', ')}]`);

      const manager = device.tuyaEF00Manager;
      const endpoint = device.zclNode?.endpoints?.[1];
      const tuyaCluster = endpoint?.clusters?.tuya || endpoint?.clusters?.[0xEF00];

      let sent = 0;

      for (const dp of dpIds) {
        try {
          if (manager && typeof manager.getData === 'function') {
            await manager.getData(dp);
            sent++;
          } else if (tuyaCluster && typeof tuyaCluster.command === 'function') {
            await tuyaCluster.command('getData', { dp }, { disableDefaultResponse: true });
            sent++;
          }
          // Small delay between queries
          await new Promise(r => setTimeout(r, 50));
        } catch (e) {
          // Continue with next DP
        }
      }

      device.log?.(`[WAKE] ✅ Sent ${sent}/${dpIds.length} DP queries`);
      return sent > 0;
    } catch (e) {
      device.log?.(`[WAKE] DP burst failed: ${e.message}`);
    }
    return false;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  TuyaGatewayEmulator,
  WakeStrategies,

  // Helper functions
  buildTimePayload,
  buildExtendedTimePayload,
  getZigbeeTimeUTC,
  getZigbeeTimeLocal,

  // Constants
  TUYA_CMD_TIME_REQUEST,
  TUYA_CMD_TIME_RESPONSE,
  TIME_BROADCAST_INTERVAL,
};
