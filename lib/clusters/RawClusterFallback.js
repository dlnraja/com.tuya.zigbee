'use strict';

// RawClusterFallback v5.13.0
// FIXES: lasse_k issue, bind-before-listen, reporting config, readAttributes
// AUTHORS: Cascade AI, dlnraja

const { logUnknownClusterAttr } = require('../utils/UnknownDPLogger');

// Auto-map ZCL attributes to Homey capabilities
const ZCL_AUTO_MAP = {
  // Temperature (0x0402)
  'msTemperatureMeasurement.measuredValue': { cap: 'measure_temperature', div: 100 },
  'temperatureMeasurement.measuredValue': { cap: 'measure_temperature', div: 100 },
  
  // Humidity (0x0405)
  'msRelativeHumidity.measuredValue': { cap: 'measure_humidity', div: 100 },
  'relativeHumidity.measuredValue': { cap: 'measure_humidity', div: 100 },
  
  // Pressure (0x0403)
  'msPressureMeasurement.measuredValue': { cap: 'measure_pressure', div: 1 },
  'msPressureMeasurement.scaledValue': { cap: 'measure_pressure', div: 10 },
  
  // Illuminance (0x0400)
  'msIlluminanceMeasurement.measuredValue': { cap: 'measure_luminance', fn: 'lux' },
  
  // Occupancy (0x0406)
  'msOccupancySensing.occupancy': { cap: 'alarm_motion', fn: 'bool' },
  'occupancySensing.occupancy': { cap: 'alarm_motion', fn: 'bool' },
  
  // Power/Energy (0x0702, 0x0B04)
  'seMetering.instantaneousDemand': { cap: 'measure_power', div: 1 },
  'seMetering.currentSummDelivered': { cap: 'meter_power', div: 1000 },
  'haElectricalMeasurement.activePower': { cap: 'measure_power', div: 10 }, // Often 10, sometimes 1
  'haElectricalMeasurement.rmsVoltage': { cap: 'measure_voltage', div: 1 }, // Often 1, sometimes 10
  'haElectricalMeasurement.rmsCurrent': { cap: 'measure_current', div: 1000 },
  
  // Battery (0x0001)
  'genPowerCfg.batteryPercentageRemaining': { cap: 'measure_battery', div: 2 },
  'genPowerCfg.batteryVoltage': { cap: 'measure_voltage', div: 10 },
  
  // Door Lock (0x0101)
  'closuresDoorLock.lockState': { cap: 'locked', fn: 'lock' },
  
  // OnOff (0x0006)
  'genOnOff.onOff': { cap: 'onoff', fn: 'bool' },
  
  // Level (0x0008)
  'genLevelCtrl.currentLevel': { cap: 'dim', div: 254 },
  
  // Window Covering (0x0102)
  'closuresWindowCovering.currentPositionLiftPercentage': { cap: 'windowcoverings_set', div: 100, inv: true },
  
  // Thermostat (0x0201)
  'hvacThermostat.localTemperature': { cap: 'measure_temperature', div: 100 },
  'hvacThermostat.occupiedHeatingSetpoint': { cap: 'target_temperature', div: 100 },
  
  // Analog Input (0x000C) - Often used for Tuya custom data
  'genAnalogInput.presentValue': { cap: null, detect: true },
  'genMultistateInput.presentValue': { cap: null, detect: true }
};

// Clusters to skip (handled by standard logic or irrelevant)
const SKIP_CLUSTERS = new Set([
  'genBasic', 'genIdentify', 'genGroups', 'genScenes', 'genOta',
  'genTime', 'genPollCtrl', 'greenPower', 'touchlink',
  'tuya', 'tuyaSpecific', 'tuyaManufacturer', 'manuSpecificTuya',
  '61184', '0xEF00', 'genCommissioning', 'lightLink'
]);

// Known readable attributes for proactive polling
const CLUSTER_ATTRS = {
  msTemperatureMeasurement: ['measuredValue'],
  temperatureMeasurement: ['measuredValue'],
  msRelativeHumidity: ['measuredValue'],
  relativeHumidity: ['measuredValue'],
  msPressureMeasurement: ['measuredValue', 'scaledValue'],
  msIlluminanceMeasurement: ['measuredValue'],
  msOccupancySensing: ['occupancy'],
  occupancySensing: ['occupancy'],
  seMetering: ['instantaneousDemand', 'currentSummDelivered'],
  haElectricalMeasurement: ['activePower', 'rmsVoltage', 'rmsCurrent'],
  genPowerCfg: ['batteryPercentageRemaining', 'batteryVoltage'],
  genAnalogInput: ['presentValue'],
  genMultistateInput: ['presentValue'],
  closuresDoorLock: ['lockState'],
  closuresWindowCovering: ['currentPositionLiftPercentage'],
  hvacThermostat: ['localTemperature', 'occupiedHeatingSetpoint', 'systemMode'],
  genLevelCtrl: ['currentLevel'],
  genOnOff: ['onOff'],
  lightingColorCtrl: ['currentHue', 'currentSaturation', 'colorTemperatureMireds']
};

function convertValue(mapEntry, value) {
  if (!mapEntry || mapEntry.detect) return null;
  
  try {
    if (mapEntry.fn === 'lux') {
      // 10000 * log10(Lux) + 1 = measuredValue
      // Lux = 10^((measuredValue - 1) / 10000)
      return value <= 0 ? 0 : Math.round(Math.pow(10, (value - 1) / 10000));
    }
    if (mapEntry.fn === 'bool') return Boolean(value);
    if (mapEntry.fn === 'lock') return value === 1; // 1=locked, 2=unlocked, 0=not_fully
    
    let val = value;
    if (mapEntry.div) val = val / mapEntry.div;
    if (mapEntry.inv) val = 1 - val; // For window coverings 0-1 range
    
    return val;
  } catch (e) {
    return value;
  }
}

class RawClusterFallback {
  constructor(device) {
    this.device = device;
    this._log = (...a) => device.log('[RAW-FALLBACK]', ...a);
    this._raw = {};
    this._listeners = [];
    this._mapped = 0;
    this._captured = 0;
    this._initialized = false;
  }

  async initialize(zclNode) {
    if (this._initialized || !zclNode || !zclNode.endpoints) return 0;
    this._initialized = true;
    
    this._log('Scanning all endpoints for unhandled clusters...');

    let attached = 0;
    // Iterate over all endpoints
    for (const [epId, ep] of Object.entries(zclNode.endpoints)) {
      if (!ep || !ep.clusters) continue;
      
      // Iterate over all clusters in endpoint
      for (const [name, cluster] of Object.entries(ep.clusters)) {
        if (this._shouldSkip(name, cluster)) continue;
        
        // Attempt to attach listener
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
    
    // Skip manufacturer specific clusters unless they are standard Tuya
    const id = this._getId(name, cluster);
    if (id !== null && id >= 0xE000 && id !== 61184) return true;
    
    // Check if already handled by driver
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
    // Check if any listener starts with this cluster name
    return cl.some(l => l.key && l.key.startsWith(name + ':'));
  }

  async _attachListener(cluster, name, epId) {
    if (!cluster) return false;
    const key = name + ':' + epId;
    if (this._raw[key]) return false;

    this._raw[key] = { attrs: {}, count: 0, firstSeen: Date.now(), lastSeen: 0, bound: false };

    // 1. BIND CLUSTER (Critical for reporting)
    try {
      if (typeof cluster.bind === 'function') {
        await Promise.race([
          cluster.bind(),
          new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 2000))
        ]);
        this._raw[key].bound = true;
      }
    } catch (e) {
      this._log(`EP${epId}: bind ${name} failed: ${e.message}`);
    }

    // 2. ATTACH LISTENER
    const onAttr = (attr, value) => this._onRawAttr(key, name, attr, value, epId);
    
    // Handle different event emission patterns
    let attached = false;
    
    // Pattern A: cluster.on('attr', ...) - Generic
    if (typeof cluster.on === 'function') {
        try {
            cluster.on('attr', onAttr);
            this._listeners.push({ cluster, event: 'attr', handler: onAttr });
            attached = true;
        } catch (e) {}
        
        // Pattern B: cluster.on('attr.attrName', ...) - Specific (zigbee-clusters)
        // We can't easily listen to ALL specific events, but 'attr' usually covers it.
        // Some implementations might require 'report' event?
    }

    if (!attached) return false;

    // 3. CONFIGURE REPORTING & READ ATTRIBUTES (Deferred)
    this._deferClusterSetup(cluster, name, epId, key);

    this._log(`EP${epId}: listening on ${name}${this._raw[key].bound ? ' (bound)' : ''}`);
    return true;
  }

  _deferClusterSetup(cluster, name, epId, key) {
    // Random delay to prevent congestion
    const delay = 5000 + Math.floor(Math.random() * 5000);
    
    setTimeout(async () => {
      const knownAttrs = CLUSTER_ATTRS[name];
      if (!knownAttrs) return; // No known attributes to configure

      // Configure Reporting
      if (typeof cluster.configureReporting === 'function') {
        try {
          const rptAttrs = knownAttrs.slice(0, 3).map(a => ({
            attributeName: a,
            minimumReportInterval: 30,
            maximumReportInterval: 3600,
            reportableChange: 1, // Aggressive reporting for discovery
          }));
          
          await Promise.race([
            cluster.configureReporting({ attributes: rptAttrs }),
            new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 3000))
          ]);
          this._log(`EP${epId}: reporting configured for ${name}`);
        } catch (e) {
          this._log(`EP${epId}: reporting config ${name} failed: ${e.message}`);
        }
      }

      // Read Attributes
      if (typeof cluster.readAttributes === 'function') {
        try {
          const values = await Promise.race([
            cluster.readAttributes(knownAttrs),
            new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 3000))
          ]);
          
          if (values && typeof values === 'object') {
            this._log(`EP${epId}: read ${name} -> ${JSON.stringify(values)}`);
            for (const [attr, val] of Object.entries(values)) {
              if (val != null) this._onRawAttr(key, name, attr, val, epId);
            }
          }
        } catch (e) {
          this._log(`EP${epId}: read ${name} failed: ${e.message}`);
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
    this._log(`EP${epId} ${cluster}.${attr} = ${valStr.length > 60 ? valStr.slice(0, 60) + '...' : valStr}`);

    logUnknownClusterAttr(this.device, cluster, attr, value, epId);
    this._tryAutoMap(cluster, attr, value, epId);
  }

  _tryAutoMap(cluster, attr, value, epId) {
    // Try exact match first: "cluster.attr"
    let mapKey = cluster + '.' + attr;
    let mapping = ZCL_AUTO_MAP[mapKey];
    
    // If not found, try generic match if strictly one-to-one mapping exists
    // (Omitted for safety to prevent false positives)

    if (!mapping || mapping.detect) return;

    const cap = mapping.cap;
    if (!cap) return;

    const finalValue = convertValue(mapping, value);
    if (finalValue === null) return;
    if (typeof finalValue === 'number' && !isFinite(finalValue)) return;

    // Check if device already has capability
    if (this.device.hasCapability(cap)) {
      this.device.setCapabilityValue(cap, finalValue).catch(() => {});
      // this._log(`AUTO-MAP: ${cluster}.${attr} -> ${cap} = ${finalValue}`);
      this._mapped++;
    } else {
      // Auto-add capability? 
      // Only for common sensors, to avoid polluting devices
      if (cap.startsWith('measure_') || cap.startsWith('meter_') || cap.startsWith('alarm_')) {
        this.device.addCapability(cap).then(() => {
          this.device.setCapabilityValue(cap, finalValue).catch(() => {});
          this._log(`AUTO-ADD + MAP: ${cap} = ${finalValue}`);
          this._mapped++;
        }).catch(() => {});
      }
    }
  }

  _scheduleSummary() {
    if (this._summaryTimer) clearTimeout(this._summaryTimer);
    this._summaryTimer = setTimeout(() => {
      this._writeSummary();
      if (this._captured > 0) this._scheduleSummary(); // Keep updating if active
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  _writeSummary() {
    const summary = {};
    for (const [key, entry] of Object.entries(this._raw)) {
      if (entry.count === 0) continue;
      summary[key] = {
        count: entry.count,
        bound: entry.bound,
        lastSeen: new Date(entry.lastSeen).toISOString(),
        attrs: Object.fromEntries(
          Object.entries(entry.attrs).map(([a, d]) => [a, { v: d.v }])
        ),
      };
    }
    
    if (Object.keys(summary).length > 0) {
      this.device.setStoreValue('_raw_cluster_summary', summary).catch(() => {});
      this._log(`Summary: ${this._captured} captured, ${this._mapped} auto-mapped`);
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
      try { 
        if (c.removeListener) c.removeListener(e, h);
        if (c.off) c.off(e, h);
      } catch (x) {}
    }
    this._listeners = [];
  }
}

module.exports = RawClusterFallback;
