'use strict';

/**
 * TuyaDPDataLogger - Universal Data Logger
 * v5.2.11 - Logs ALL incoming DPs for debugging and KPI
 * v5.2.83 - Now tracks BOTH Tuya DPs AND ZCL cluster reports!
 *
 * This module ensures that every data point received from devices
 * is properly logged, stored, and can be tracked for diagnostics.
 */

class TuyaDPDataLogger {

  constructor(device) {
    this.device = device;
    this.receivedDPs = {};
    this.receivedZCL = {};  // v5.2.83: Track ZCL cluster data too!
    this.lastUpdate = null;
    this.lastZCLUpdate = null;
    this.startTime = Date.now();
  }

  /**
   * Initialize the logger and attach to TuyaEF00Manager
   */
  async initialize() {
    this.device.log('[DP-LOGGER] 📊 Initializing Tuya DP Data Logger...');

    // Get the manager
    const manager = this.device.tuyaEF00Manager;

    if (!manager) {
      this.device.log('[DP-LOGGER] ⚠️ No TuyaEF00Manager found');
      return false;
    }

    // Listen to ALL DP events
    manager.on('datapoint', ({ dp, value, dpType }) => {
      this._logDP(dp, value, dpType);
    });

    manager.on('dpReport', ({ dpId, value, dpType }) => {
      this._logDP(dpId, value, dpType);
    });

    // Listen to individual DPs (1-200)
    for (let dp = 1; dp <= 200; dp++) {
      manager.on(`dp-${dp}`, (value) => {
        this._logDP(dp, value, 'event');
      });
    }

    this.device.log('[DP-LOGGER] ✅ Logger attached to all DP events');

    // v5.2.83: Also track ZCL cluster reports
    this._setupZCLTracking();

    // Store initial status
    await this._storeStatus();

    return true;
  }

  /**
   * v5.2.83: Setup tracking for ZCL cluster reports
   * This captures standard Zigbee data that doesn't come via Tuya DP
   */
  _setupZCLTracking() {
    const endpoint = this.device.zclNode?.endpoints?.[1];
    if (!endpoint || !endpoint.clusters) {
      this.device.log('[DP-LOGGER] ℹ️ No ZCL clusters to track');
      return;
    }

    const clusters = endpoint.clusters;

    // Track temperature cluster
    if (clusters.temperatureMeasurement || clusters.msTemperatureMeasurement) {
      const cluster = clusters.temperatureMeasurement || clusters.msTemperatureMeasurement;
      cluster.on('attr.measuredValue', (value) => {
        this._logZCL('temperature', value / 100, '°C');
      });
      this.device.log('[DP-LOGGER] ✅ Tracking ZCL temperature cluster');
    }

    // Track humidity cluster
    if (clusters.relativeHumidity || clusters.msRelativeHumidity) {
      const cluster = clusters.relativeHumidity || clusters.msRelativeHumidity;
      cluster.on('attr.measuredValue', (value) => {
        this._logZCL('humidity', value / 100, '%');
      });
      this.device.log('[DP-LOGGER] ✅ Tracking ZCL humidity cluster');
    }

    // Track illuminance cluster
    if (clusters.illuminanceMeasurement || clusters.msIlluminanceMeasurement) {
      const cluster = clusters.illuminanceMeasurement || clusters.msIlluminanceMeasurement;
      cluster.on('attr.measuredValue', (value) => {
        const lux = value > 0 ? Math.round(Math.pow(10, (value - 1) / 10000)) : 0;
        this._logZCL('illuminance', lux, 'lux');
      });
      this.device.log('[DP-LOGGER] ✅ Tracking ZCL illuminance cluster');
    }

    // Track battery cluster
    if (clusters.powerConfiguration || clusters.genPowerCfg) {
      const cluster = clusters.powerConfiguration || clusters.genPowerCfg;
      cluster.on('attr.batteryPercentageRemaining', (value) => {
        this._logZCL('battery', Math.round(value / 2), '%');
      });
      this.device.log('[DP-LOGGER] ✅ Tracking ZCL battery cluster');
    }

    // Track IAS Zone (motion)
    if (clusters.iasZone) {
      // IAS Zone uses different event mechanism - track via device
      this.device.log('[DP-LOGGER] ✅ Tracking IAS Zone (motion via device events)');
    }

    // Track on/off cluster
    if (clusters.onOff || clusters.genOnOff) {
      const cluster = clusters.onOff || clusters.genOnOff;
      cluster.on('attr.onOff', (value) => {
        this._logZCL('onoff', Boolean(value), '');
      });
      this.device.log('[DP-LOGGER] ✅ Tracking ZCL on/off cluster');
    }
  }

  /**
   * v5.2.83: Log ZCL cluster data
   */
  _logZCL(type, value, unit) {
    const timestamp = Date.now();

    this.receivedZCL[type] = {
      value: value,
      unit: unit,
      timestamp: timestamp,
      count: (this.receivedZCL[type]?.count || 0) + 1
    };

    this.lastZCLUpdate = timestamp;
    this.lastUpdate = timestamp;

    this.device.log(`[DATA-LOGGER] 📡 ZCL ${type} = ${value}${unit}`);
  }

  /**
   * Log a received DP
   */
  _logDP(dpId, value, dpType) {
    const timestamp = Date.now();

    // Store in memory
    this.receivedDPs[dpId] = {
      value: value,
      type: dpType,
      timestamp: timestamp,
      count: (this.receivedDPs[dpId]?.count || 0) + 1
    };

    this.lastUpdate = timestamp;

    // Log to console
    this.device.log(`[DP-LOGGER] 📦 DP${dpId} = ${JSON.stringify(value)} (type: ${dpType || 'unknown'})`);

    // Store to device store
    this.device.setStoreValue(`dp_log_${dpId}`, {
      value: value,
      type: dpType,
      timestamp: timestamp
    }).catch(() => { });

    this.device.setStoreValue('dp_logger_last_update', timestamp).catch(() => { });
    this.device.setStoreValue('dp_logger_received_count', Object.keys(this.receivedDPs).length).catch(() => { });

    // Auto-update capabilities based on common DP mappings
    this._autoUpdateCapability(dpId, value);
  }

  /**
   * Auto-update device capabilities based on known DP mappings
   */
  _autoUpdateCapability(dpId, value) {
    const DP_CAPABILITY_MAP = {
      // Battery
      4: { cap: 'measure_battery', parser: v => v },
      14: { cap: 'alarm_battery', parser: v => Boolean(v) },
      15: { cap: 'measure_battery', parser: v => v },
      33: { cap: 'measure_battery', parser: v => v },
      35: { cap: 'measure_battery', parser: v => v },

      // Temperature (divided by 10)
      1: { cap: 'measure_temperature', parser: v => typeof v === 'number' && v > 100 ? v / 10 : v },
      3: { cap: 'measure_temperature', parser: v => v / 10 },
      18: { cap: 'measure_temperature', parser: v => v / 10 },

      // Humidity (divided by 10 or direct)
      2: { cap: 'measure_humidity', parser: v => typeof v === 'number' && v > 100 ? v / 10 : v },
      5: { cap: 'measure_humidity', parser: v => typeof v === 'number' && v > 100 ? v / 10 : v },
      19: { cap: 'measure_humidity', parser: v => v / 10 },

      // Motion/Presence
      // Note: DP1 can be both temperature OR motion - check value type
    };

    const mapping = DP_CAPABILITY_MAP[dpId];

    if (mapping && this.device.hasCapability(mapping.cap)) {
      try {
        const parsedValue = mapping.parser(value);

        // Validate value
        if (parsedValue === null || parsedValue === undefined) return;
        if (typeof parsedValue === 'number' && (isNaN(parsedValue) || !isFinite(parsedValue))) return;

        this.device.setCapabilityValue(mapping.cap, parsedValue)
          .then(() => {
            this.device.log(`[DP-LOGGER] ✅ ${mapping.cap} = ${parsedValue} (from DP${dpId})`);
          })
          .catch(err => {
            this.device.error(`[DP-LOGGER] ❌ Failed to set ${mapping.cap}:`, err.message);
          });
      } catch (err) {
        this.device.error(`[DP-LOGGER] Parse error for DP${dpId}:`, err.message);
      }
    }

    // Special handling for DP1 - could be motion (bool) or temperature (number)
    if (dpId === 1) {
      if (value === true || value === false || value === 0 || value === 1) {
        // Looks like motion
        if (this.device.hasCapability('alarm_motion')) {
          this.device.setCapabilityValue('alarm_motion', Boolean(value))
            .then(() => this.device.log(`[DP-LOGGER] ✅ alarm_motion = ${Boolean(value)} (from DP1)`))
            .catch(() => { });
        }
      }
    }
  }

  /**
   * Store current status
   */
  async _storeStatus() {
    const status = {
      initialized: true,
      startTime: this.startTime,
      receivedDPs: Object.keys(this.receivedDPs),
      lastUpdate: this.lastUpdate,
      dpCount: Object.keys(this.receivedDPs).length
    };

    await this.device.setStoreValue('dp_logger_status', status).catch(() => { });
  }

  /**
   * Get status report
   */
  getStatus() {
    const now = Date.now();
    const uptime = Math.floor((now - this.startTime) / 1000);
    const timeSinceLastDP = this.lastUpdate ? Math.floor((now - this.lastUpdate) / 1000) : null;

    return {
      uptime: `${uptime}s`,
      receivedDPs: Object.keys(this.receivedDPs).map(dp => `DP${dp}`),
      dpCount: Object.keys(this.receivedDPs).length,
      lastUpdate: this.lastUpdate ? new Date(this.lastUpdate).toISOString() : 'Never',
      timeSinceLastDP: timeSinceLastDP !== null ? `${timeSinceLastDP}s ago` : 'No data yet',
      details: this.receivedDPs
    };
  }

  /**
   * Log status to console
   * v5.2.83: Now shows BOTH Tuya DP AND ZCL data
   */
  logStatus() {
    const status = this.getStatus();
    const zclCount = Object.keys(this.receivedZCL).length;
    const zclTypes = Object.keys(this.receivedZCL);
    const totalData = status.dpCount + zclCount;

    this.device.log('══════════════════════════════════════════════════════════════');
    this.device.log('[DATA-LOGGER] 📊 STATUS REPORT');
    this.device.log('══════════════════════════════════════════════════════════════');
    this.device.log(`   Uptime: ${status.uptime}`);
    this.device.log(`   Tuya DPs: ${status.dpCount} (${status.receivedDPs.join(', ') || 'none'})`);
    this.device.log(`   ZCL Data: ${zclCount} (${zclTypes.join(', ') || 'none'})`);
    this.device.log(`   Total Data Points: ${totalData}`);
    this.device.log(`   Last Update: ${status.lastUpdate}`);

    // Show ZCL values if available
    if (zclCount > 0) {
      this.device.log('   📡 ZCL Values:');
      for (const [type, data] of Object.entries(this.receivedZCL)) {
        this.device.log(`      ${type}: ${data.value}${data.unit} (x${data.count})`);
      }
    }

    if (totalData === 0) {
      this.device.log('   ⚠️ NO DATA RECEIVED YET');
      this.device.log('   ℹ️ Battery devices may take 4-24 hours to wake up');
      this.device.log('   ℹ️ Try triggering the device (motion, press button, etc.)');
    } else if (status.dpCount === 0 && zclCount > 0) {
      this.device.log('   ✅ Device uses standard Zigbee (ZCL), not Tuya DP');
      this.device.log('   ℹ️ This is normal - data is coming via ZCL clusters');
    }

    this.device.log('══════════════════════════════════════════════════════════════');
  }

  /**
   * v5.2.83: Track motion from IAS Zone (called externally)
   */
  logMotion(detected) {
    this._logZCL('motion', detected, '');
  }
}

module.exports = TuyaDPDataLogger;
