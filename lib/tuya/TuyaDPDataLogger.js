'use strict';
const { safeDivide, safeParse } = require('../utils/tuyaUtils.js');

/**
 * TuyaDPDataLogger - Universal Data Logger
 */

class TuyaDPDataLogger {

  constructor(device) {
    this.device = device;
    this.receivedDPs = {};
    this.receivedZCL = {};
    this.lastUpdate = null;
    this.lastZCLUpdate = null;
    this.startTime = Date.now();
  }

  async initialize() {
    this.device.log('[DP-LOGGER]  Initializing Tuya DP Data Logger...');

    const manager = this.device.tuyaEF00Manager;
    if (!manager) {
      this.device.log('[DP-LOGGER]  No TuyaEF00Manager found');
      return false;
    }

    manager.on('datapoint', ({ dp, value, dpType }) => {
      this._logDP(dp, value, dpType);
    });

    manager.on('dpReport', ({ dpId, value, dpType }) => {
      this._logDP(dpId, value, dpType);
    });

    for (let dp = 1; dp <= 200; dp++) {
      manager.on(`dp-${dp}`, (value) => {
        this._logDP(dp, value, 'event');
      });
    }

    this.device.log('[DP-LOGGER]  Logger attached to all DP events');
    this._setupZCLTracking();
    await this._storeStatus();

    return true;
  }

  _setupZCLTracking() {
    const endpoint = this.device.zclNode?.endpoints?.[1];
    if (!endpoint || !endpoint.clusters) {
      this.device.log('[DP-LOGGER]  No ZCL clusters to track');
      return;
    }

    const clusters = endpoint.clusters;

    if (clusters.temperatureMeasurement || clusters.msTemperatureMeasurement) {
      const cluster = clusters.temperatureMeasurement || clusters.msTemperatureMeasurement;
      cluster.on('attr.measuredValue', (value) => {
        this._logZCL('temperature', value / 100, '°C');
      });
      this.device.log('[DP-LOGGER]  Tracking ZCL temperature cluster');
    }

    if (clusters.relativeHumidity || clusters.msRelativeHumidity) {
      const cluster = clusters.relativeHumidity || clusters.msRelativeHumidity;
      cluster.on('attr.measuredValue', (value) => {
        this._logZCL('humidity', value / 100, '%');
      });
      this.device.log('[DP-LOGGER]  Tracking ZCL humidity cluster');
    }

    if (clusters.illuminanceMeasurement || clusters.msIlluminanceMeasurement) {
      const cluster = clusters.illuminanceMeasurement || clusters.msIlluminanceMeasurement;
      cluster.on('attr.measuredValue', (value) => {
        const lux = value > 0 ? Math.round(Math.pow(10, (value - 1) / 10000)) : 0;
        this._logZCL('illuminance', lux, 'lux');
      });
      this.device.log('[DP-LOGGER]  Tracking ZCL illuminance cluster');
    }

    if (clusters.powerConfiguration || clusters.genPowerCfg) {
      const cluster = clusters.powerConfiguration || clusters.genPowerCfg;
      cluster.on('attr.batteryPercentageRemaining', (value) => {
        this._logZCL('battery', Math.round(value / 2), '%');
      });
      this.device.log('[DP-LOGGER]  Tracking ZCL battery cluster');
    }

    if (clusters.iasZone) {
      this.device.log('[DP-LOGGER]  Tracking IAS Zone (motion via device events)');
    }

    if (clusters.onOff || clusters.genOnOff) {
      const cluster = clusters.onOff || clusters.genOnOff;
      cluster.on('attr.onOff', (value) => {
        this._logZCL('onoff', Boolean(value), '');
      });
      this.device.log('[DP-LOGGER]  Tracking ZCL on/off cluster');
    }
  }

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
    this.device.log(`[DATA-LOGGER]  ZCL ${type} = ${value}${unit}`);
  }

  _logDP(dpId, value, dpType) {
    const timestamp = Date.now();
    this.receivedDPs[dpId] = {
      value: value,
      type: dpType,
      timestamp: timestamp,
      count: (this.receivedDPs[dpId]?.count || 0) + 1
    };
    this.lastUpdate = timestamp;
    this.device.log(`[DP-LOGGER]  DP${dpId} = ${JSON.stringify(value)} (type: ${dpType || 'unknown'})`);

    this.device.setStoreValue(`dp_log_${dpId}`, {
      value: value,
      type: dpType,
      timestamp: timestamp
    }).catch(() => { });

    this.device.setStoreValue('dp_logger_last_update', timestamp).catch(() => { });
    this.device.setStoreValue('dp_logger_received_count', Object.keys(this.receivedDPs).length).catch(() => { });

    this._autoUpdateCapability(dpId, value);
  }

  _autoUpdateCapability(dpId, value) {
    const DP_CAPABILITY_MAP = {
      4: { cap: 'measure_battery', parser: v => v },
      14: { cap: 'alarm_battery', parser: v => Boolean(v) },
      15: { cap: 'measure_battery', parser: v => v },
      33: { cap: 'measure_battery', parser: v => v },
      35: { cap: 'measure_battery', parser: v => v },
      1: { cap: 'measure_temperature', parser: v => typeof v === 'number' && v > 100 ? v / 10 : v },
      3: { cap: 'measure_temperature', parser: v => v / 10 },
      18: { cap: 'measure_temperature', parser: v => v / 10 },
      2: { cap: 'measure_humidity', parser: v => typeof v === 'number' && v > 100 ? v / 10 : v },
      5: { cap: 'measure_humidity', parser: v => typeof v === 'number' && v > 100 ? v / 10 : v },
      19: { cap: 'measure_humidity', parser: v => v / 10 },
    };

    const mapping = DP_CAPABILITY_MAP[dpId];
    if (mapping && this.device.hasCapability(mapping.cap)) {
      try {
        const parsedValue = mapping.parser(value);
        if (parsedValue === null || parsedValue === undefined) return;
        if (typeof parsedValue === 'number' && (isNaN(parsedValue) || !isFinite(parsedValue))) return;

        this.device.setCapabilityValue(mapping.cap, parsedValue)
          .then(() => {
            this.device.log(`[DP-LOGGER]  ${mapping.cap} = ${parsedValue} (from DP${dpId})`);
          })
          .catch(err => {
            this.device.error(`[DP-LOGGER]  Failed to set ${mapping.cap}:`, err.message);
          });
      } catch (err) {
        this.device.error(`[DP-LOGGER] Parse error for DP${dpId}:`, err.message);
      }
    }

    if (dpId === 1) {
      if (value === true || value === false || value === 0 || value === 1) {
        if (this.device.hasCapability('alarm_motion')) {
          this.device.setCapabilityValue('alarm_motion', Boolean(value))
            .then(() => this.device.log(`[DP-LOGGER]  alarm_motion = ${Boolean(value)} (from DP1)`))
            .catch(() => { });
        }
      }
    }
  }

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

  logStatus() {
    const status = this.getStatus();
    const zclCount = Object.keys(this.receivedZCL).length;
    const zclTypes = Object.keys(this.receivedZCL);
    const totalData = status.dpCount + zclCount;

    this.device.log('');
    this.device.log('[DATA-LOGGER]  STATUS REPORT');
    this.device.log('');
    this.device.log(`   Uptime: ${status.uptime}`);
    this.device.log(`   Tuya DPs: ${status.dpCount} (${status.receivedDPs.join(', ') || 'none'})`);
    this.device.log(`   ZCL Data: ${zclCount} (${zclTypes.join(', ') || 'none'})`);
    this.device.log(`   Total Data Points: ${totalData}`);
    this.device.log(`   Last Update: ${status.lastUpdate}`);

    if (zclCount > 0) {
      this.device.log('    ZCL Values:');
      for (const [type, data] of Object.entries(this.receivedZCL)) {
        this.device.log(`      ${type}: ${data.value}${data.unit} (x${data.count})`);
      }
    }

    if (totalData === 0) {
      this.device.log('    NO DATA RECEIVED YET');
    }

    this.device.log('');
  }

  logMotion(detected) {
    this._logZCL('motion', detected, '');
  }
}

module.exports = TuyaDPDataLogger;
