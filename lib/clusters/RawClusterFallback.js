'use strict';

// RawClusterFallback v5.12.0
// Fixes: bind before listen, configureReporting, readAttributes, proper skip
const { logUnknownClusterAttr } = require('../utils/UnknownDPLogger');

const ZCL_AUTO_MAP = {
  'msTemperatureMeasurement.measuredValue': { cap: 'measure_temperature', div: 100 },
  'temperatureMeasurement.measuredValue': { cap: 'measure_temperature', div: 100 },
  'msRelativeHumidity.measuredValue': { cap: 'measure_humidity', div: 100 },
  'relativeHumidity.measuredValue': { cap: 'measure_humidity', div: 100 },
  'msPressureMeasurement.measuredValue': { cap: 'measure_pressure', div: 1 },
  'msIlluminanceMeasurement.measuredValue': { cap: 'measure_luminance', fn: 'lux' },
  'msOccupancySensing.occupancy': { cap: 'alarm_motion', fn: 'bool' },
  'occupancySensing.occupancy': { cap: 'alarm_motion', fn: 'bool' },
  'seMetering.instantaneousDemand': { cap: 'measure_power', div: 1 },
  'seMetering.currentSummDelivered': { cap: 'meter_power', div: 1000 },
  'haElectricalMeasurement.activePower': { cap: 'measure_power', div: 10 },
  'haElectricalMeasurement.rmsVoltage': { cap: 'measure_voltage', div: 10 },
  'haElectricalMeasurement.rmsCurrent': { cap: 'measure_current', div: 1000 },
  'genPowerCfg.batteryPercentageRemaining': { cap: 'measure_battery', div: 2 },
  'genAnalogInput.presentValue': { cap: null, detect: true },
  'closuresDoorLock.lockState': { cap: 'locked', fn: 'lock' },
};

const SKIP_CLUSTERS = new Set([
  'genBasic', 'genIdentify', 'genGroups', 'genScenes', 'genOta',
  'genTime', 'genPollCtrl', 'greenPower', 'touchlink',
  'tuya', 'tuyaSpecific', 'tuyaManufacturer', 'manuSpecificTuya',
  '61184', '0xEF00', 'genCommissioning',
]);

// Known readable attrs per cluster (for deferred reads)
const CLUSTER_ATTRS = {
  msTemperatureMeasurement: ['measuredValue'],
  temperatureMeasurement: ['measuredValue'],
  msRelativeHumidity: ['measuredValue'],
  relativeHumidity: ['measuredValue'],
  msPressureMeasurement: ['measuredValue', 'scaledValue'],
  msIlluminanceMeasurement: ['measuredValue'],
  msOccupancySensing: ['occupancy', 'occupancySensorType'],
  occupancySensing: ['occupancy'],
  seMetering: ['instantaneousDemand', 'currentSummDelivered'],
  haElectricalMeasurement: ['activePower', 'rmsVoltage', 'rmsCurrent'],
  genPowerCfg: ['batteryPercentageRemaining', 'batteryVoltage'],
  genAnalogInput: ['presentValue', 'description'],
  genMultistateInput: ['presentValue'],
  closuresDoorLock: ['lockState', 'doorState'],
  closuresWindowCovering: ['currentPositionLiftPercentage'],
  hvacThermostat: ['localTemperature', 'occupiedHeatingSetpoint', 'systemMode'],
  genLevelCtrl: ['currentLevel'],
  genOnOff: ['onOff'],
  lightingColorCtrl: ['currentHue', 'currentSaturation', 'colorTemperatureMireds'],
};

function convertValue(mapEntry, value) {
  if (!mapEntry || mapEntry.detect) return null;
  if (mapEntry.fn === 'lux') return value <= 0 ? 0 : Math.round(Math.pow(10, (value - 1) / 10000));
  if (mapEntry.fn === 'bool') return Boolean(value & 1);
  if (mapEntry.fn === 'lock') return value === 1;
  if (mapEntry.div) return typeof value === 'number' ? value / mapEntry.div : value;
  return value;
}

class RawClusterFallback {
  constructor(device) {
    this.device = device;
    this._log = (...a) => device.log('[RAW-FALLBACK]', ...a);
    this._raw = {};
    this._listeners = [];
    this._mapped = 0;
    this._captured = 0;
  }

  async initialize(zclNode) {
    if (!zclNode || !zclNode.endpoints) return 0;
    this._log('Scanning all endpoints for unhandled clusters...');

    let attached = 0;
    for (const [epId, ep] of Object.entries(zclNode.endpoints)) {
      if (!ep || !ep.clusters) continue;
      for (const [name, cluster] of Object.entries(ep.clusters)) {
        if (this._shouldSkip(name, cluster)) continue;
        const ok = await this._attachListener(cluster, name, parseInt(epId));
        if (ok) attached++;
      }
    }

    this._log(attached > 0
      ? `Attached raw listeners on ${attached} unhandled clusters`
      : 'All clusters already handled by driver');

    if (attached > 0) this._scheduleSummary();
    return attached;
  }

  _shouldSkip(name, cluster) {
    if (SKIP_CLUSTERS.has(name)) return true;
    if (typeof cluster !== 'object' || cluster === null) return true;
    if (name === 'getClusterById' || name === 'bind' || name === 'unbind') return true;
    const id = this._getId(name, cluster);
    if (id !== null && id >= 0xE000) return true;
    if (this._isHandled(name)) return true;
    return false;
  }

  _getId(name, cluster) {
    if (cluster && cluster.ID !== undefined) return cluster.ID;
    const n = parseInt(name);
    return isNaN(n) ? null : n;
  }

  _isHandled(name) {
    const cl = this.device._clusterListeners;
    if (!Array.isArray(cl)) return false;
    return cl.some(l => l.key && l.key.startsWith(name + ':'));
  }

  async _attachListener(cluster, name, epId) {
    if (!cluster || typeof cluster.on !== 'function') return false;
    const key = name + ':' + epId;
    if (this._raw[key]) return false;

    this._raw[key] = { attrs: {}, count: 0, firstSeen: Date.now(), lastSeen: 0, bound: false };

    // CRITICAL FIX v5.12.0: BIND cluster before listening
    try {
      if (typeof cluster.bind === 'function') {
        await Promise.race([
          cluster.bind(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('bind timeout')), 5000)),
        ]);
        this._raw[key].bound = true;
      }
    } catch (e) {
      this._log('EP' + epId + ': bind ' + name + ' failed: ' + e.message);
    }

    // Attach attr event listener
    const onAttr = (attr, value) => this._onRawAttr(key, name, attr, value, epId);
    try {
      cluster.on('attr', onAttr);
      this._listeners.push({ cluster, event: 'attr', handler: onAttr });
    } catch (e) { return false; }

    // FIX v5.12.0: Deferred configureReporting + readAttributes
    this._deferClusterRead(cluster, name, epId, key);

    this._log('EP' + epId + ': listening on ' + name + (this._raw[key].bound ? ' (bound)' : ' (unbound)'));
    return true;
  }

  _deferClusterRead(cluster, name, epId, key) {
    const delay = 6000 + Math.floor(Math.random() * 4000);
    setTimeout(async () => {
      // Step 1: Try configureReporting for known attrs
      const knownAttrs = CLUSTER_ATTRS[name];
      if (knownAttrs && typeof cluster.configureReporting === 'function') {
        try {
          const rptAttrs = knownAttrs.slice(0, 3).map(a => ({
            attributeName: a,
            minimumReportInterval: 60,
            maximumReportInterval: 3600,
            reportableChange: 1,
          }));
          await Promise.race([
            cluster.configureReporting({ attributes: rptAttrs }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
          ]);
          this._log('EP' + epId + ': reporting configured for ' + name);
        } catch (e) {
          this._log('EP' + epId + ': reporting config ' + name + ' skipped: ' + e.message);
        }
      }

      // Step 2: Try readAttributes for known attrs
      const readAttrs = knownAttrs || ['presentValue'];
      if (typeof cluster.readAttributes === 'function') {
        try {
          const values = await Promise.race([
            cluster.readAttributes(readAttrs),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
          ]);
          if (values && typeof values === 'object') {
            for (const [attr, val] of Object.entries(values)) {
              if (val != null) this._onRawAttr(key, name, attr, val, epId);
            }
            this._log('EP' + epId + ': read ' + Object.keys(values).length + ' attrs from ' + name);
          }
        } catch (e) {
          this._log('EP' + epId + ': read ' + name + ' failed: ' + e.message);
        }
      }
    }, delay);
  }

  _onRawAttr(key, cluster, attr, value, epId) {
    const entry = this._raw[key];
    if (!entry) return;
    entry.count++;
    entry.lastSeen = Date.now();
    entry.attrs[attr] = { v: value, t: typeof value, ts: Date.now() };
    this._captured++;

    const valStr = JSON.stringify(value);
    this._log('EP' + epId + ' ' + cluster + '.' + attr + ' = ' + (valStr.length > 120 ? valStr.slice(0, 120) + '...' : valStr));

    logUnknownClusterAttr(this.device, cluster, attr, value, epId);
    this._tryAutoMap(cluster, attr, value, epId);
  }

  _tryAutoMap(cluster, attr, value, epId) {
    const mapKey = cluster + '.' + attr;
    const mapping = ZCL_AUTO_MAP[mapKey];
    if (!mapping || mapping.detect) return;

    const cap = mapping.cap;
    if (!cap) return;

    const finalValue = convertValue(mapping, value);
    if (finalValue === null) return;
    if (typeof finalValue === 'number' && !isFinite(finalValue)) return;

    if (this.device.hasCapability(cap)) {
      this.device.setCapabilityValue(cap, finalValue).catch(() => {});
      this._log('AUTO-MAP: ' + cluster + '.' + attr + ' -> ' + cap + ' = ' + finalValue);
      this._mapped++;
    } else if (cap.startsWith('measure_') || cap.startsWith('meter_') || cap.startsWith('alarm_')) {
      this.device.addCapability(cap).then(() => {
        this.device.setCapabilityValue(cap, finalValue).catch(() => {});
        this._log('AUTO-ADD + MAP: ' + cap + ' = ' + finalValue);
        this._mapped++;
      }).catch(() => {});
    }
  }

  _scheduleSummary() {
    this._summaryTimer = setTimeout(() => {
      this._writeSummary();
      if (this._captured > 0) this._scheduleSummary();
    }, 300000);
  }

  _writeSummary() {
    const summary = {};
    for (const [key, entry] of Object.entries(this._raw)) {
      if (entry.count === 0) continue;
      summary[key] = {
        count: entry.count,
        bound: entry.bound,
        lastSeen: entry.lastSeen,
        attrs: Object.fromEntries(
          Object.entries(entry.attrs).map(([a, d]) => [a, { v: d.v, t: d.t }])
        ),
      };
    }
    if (Object.keys(summary).length > 0) {
      this.device.setStoreValue('_raw_cluster_summary', summary).catch(() => {});
      this._log('Summary: ' + this._captured + ' captured, ' + this._mapped + ' auto-mapped');
      try {
        this.device.setSettings({ raw_cluster_log: JSON.stringify(summary).slice(0, 1024) }).catch(() => {});
      } catch (e) { /* settings key may not exist */ }
    }
  }

  getSummary() {
    return {
      captured: this._captured,
      mapped: this._mapped,
      clusters: Object.keys(this._raw).filter(k => this._raw[k].count > 0),
      raw: this._raw,
    };
  }

  destroy() {
    if (this._summaryTimer) clearTimeout(this._summaryTimer);
    for (const { cluster: c, event: e, handler: h } of this._listeners) {
      try { if (c.removeListener) c.removeListener(e, h); } catch (x) {}
    }
    this._listeners = [];
  }
}

module.exports = RawClusterFallback;
