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
  'genPowerCfg.batteryVoltage': { cap: 'measure_battery', fn: 'voltage' },
  'hvacThermostat.localTemperature': { cap: 'measure_temperature', div: 100 },
  'hvacThermostat.occupiedHeatingSetpoint': { cap: 'target_temperature', div: 100 },
  'closuresWindowCovering.currentPositionLiftPercentage': { cap: 'windowcoverings_set', div: 100 },
  'closuresDoorLock.lockState': { cap: 'locked', fn: 'doorlock' },
  'genOnOff.onOff': { cap: 'onoff', fn: 'bool' },
  'genLevelCtrl.currentLevel': { cap: 'dim', div: 254 },
  'lightingColorCtrl.colorTemperatureMireds': { cap: 'light_temperature', fn: 'mireds' },
  'ssIasZone.zoneStatus': { cap: 'alarm_contact', fn: 'ias_zone' },
  'msCO2.measuredValue': { cap: 'measure_co2', div: 1 }
};

const SKIP_CLUSTERS = new Set([
  'genBasic', 'genIdentify', 'genGroups', 'genScenes', 'genTime',
  'genOta', 'genPollCtrl', 'greenPower', 'touchlink'
]);

const CLUSTER_ATTRS = {
  'msTemperatureMeasurement': ['measuredValue'],
  'msRelativeHumidity': ['measuredValue'],
  'msIlluminanceMeasurement': ['measuredValue'],
  'msPressureMeasurement': ['measuredValue'],
  'msOccupancySensing': ['occupancy'],
  'seMetering': ['instantaneousDemand', 'currentSummDelivered'],
  'haElectricalMeasurement': ['activePower', 'rmsVoltage', 'rmsCurrent'],
  'genPowerCfg': ['batteryPercentageRemaining', 'batteryVoltage'],
  'hvacThermostat': ['localTemperature', 'occupiedHeatingSetpoint'],
  'closuresWindowCovering': ['currentPositionLiftPercentage'],
  'closuresDoorLock': ['lockState'],
  'genOnOff': ['onOff'],
  'genLevelCtrl': ['currentLevel'],
  'lightingColorCtrl': ['colorTemperatureMireds'],
  'ssIasZone': ['zoneStatus']
};

class RawClusterFallback {
  constructor(device) {
    this.device = device;
    this.handled = new Set();
    this.discovered = [];
    this.timer = null;
    this.device.log('[RAW-FALLBACK] Initialized (v5.12.0 - Bind & Report fixes)');
  }

  async initialize(zclNode) {
    if (!zclNode || !zclNode.endpoints) return;

    for (const epId in zclNode.endpoints) {
      const ep = zclNode.endpoints[epId];
      if (!ep.clusters) continue;

      for (const clusterName in ep.clusters) {
        const cluster = ep.clusters[clusterName];
        if (this._shouldSkip(clusterName, cluster)) continue;

        const key = this._getId(clusterName, cluster);
        if (this._isHandled(key)) continue;

        this.device.log(`[RAW-FALLBACK] 🔍 Found unhandled cluster: ${clusterName} (EP:${epId})`);
        this.handled.add(key);
        this.discovered.push({ ep: epId, cluster: clusterName });

        await this._attachListener(cluster, clusterName, epId, key);
      }
    }
    
    this._scheduleSummary();
  }

  _shouldSkip(name, cluster) {
    if (SKIP_CLUSTERS.has(name)) return true;
    if (name.toLowerCase().includes('tuya') || name === '0xef00') return true;
    
    // v5.12.0 FIX: Safely check for listeners without crashing
    try {
      const hasListener = cluster.listenerCount && (cluster.listenerCount('attr') > 0 || cluster.listenerCount('report') > 0);
      return hasListener;
    } catch (e) {
      return false;
    }
  }

  _getId(name, cluster) {
    return `${name}_${cluster.NAME || 'unknown'}`;
  }

  _isHandled(key) {
    return this.handled.has(key);
  }

  async _attachListener(cluster, name, epId, key) {
    try {
      // v5.12.0 CRITICAL FIX 1: Must bind before listening to ZCL attributes
      if (typeof cluster.bind === 'function') {
        this.device.log(`[RAW-FALLBACK] 🔗 Binding cluster ${name} on EP ${epId}...`);
        await cluster.bind().catch(e => {
          this.device.log(`[RAW-FALLBACK] ⚠️ Bind failed for ${name}: ${e.message}`);
        });
      }

      // v5.12.0 CRITICAL FIX 2: Correct event name is 'attr', not 'report'
      cluster.on('attr', (attr, value) => {
        this._onRawAttr(key, cluster, attr, value, epId);
      });
      
      this.device.log(`[RAW-FALLBACK] 👂 Listening to ${name} on EP ${epId}`);

      // v5.12.0 CRITICAL FIX 3 & 4: Deferred configureReporting and readAttributes
      this._deferClusterRead(cluster, name, epId);

    } catch (err) {
      this.device.log(`[RAW-FALLBACK] ❌ Failed to attach listener to ${name}: ${err.message}`);
    }
  }

  _deferClusterRead(cluster, name, epId) {
    setTimeout(async () => {
      const attrsToRead = CLUSTER_ATTRS[name] || [];
      if (attrsToRead.length === 0) return;

      try {
        // Configure reporting if supported
        if (typeof cluster.configureReporting === 'function') {
          for (const attr of attrsToRead) {
            this.device.log(`[RAW-FALLBACK] ⚙️ Configuring reporting for ${name}.${attr}...`);
            await cluster.configureReporting({
              attribute: attr,
              minimumReportInterval: 10,
              maximumReportInterval: 3600,
              reportableChange: 1
            }).catch(e => this.device.log(`[RAW-FALLBACK] ⚠️ Config reporting failed: ${e.message}`));
          }
        }

        // Read initial attributes
        if (typeof cluster.readAttributes === 'function') {
          this.device.log(`[RAW-FALLBACK] 📖 Reading initial attributes for ${name}...`);
          const data = await cluster.readAttributes(attrsToRead).catch(() => null);
          if (data) {
            for (const [attr, value] of Object.entries(data)) {
              if (value !== undefined && value !== null) {
                this.device.log(`[RAW-FALLBACK] 📥 Initial read ${name}.${attr} = ${value}`);
                this._onRawAttr(`${name}_init`, cluster, attr, value, epId);
              }
            }
          }
        }
      } catch (err) {
        this.device.log(`[RAW-FALLBACK] ⚠️ Deferred setup failed for ${name}: ${err.message}`);
      }
    }, 5000 + (Math.random() * 5000)); // Staggered delay to avoid network flood
  }

  _onRawAttr(key, cluster, attr, value, epId) {
    const clusterName = cluster.NAME || key.split('_')[0];
    const attrName = typeof attr === 'object' ? (attr.name || attr.id) : attr;
    const lookupKey = `${clusterName}.${attrName}`;
    
    this.device.log(`[RAW-FALLBACK] �� RAW ZCL: ${lookupKey} = ${value} (EP:${epId})`);
    
    // Log for unknown DP tracking
    logUnknownClusterAttr(this.device, epId, clusterName, attrName, value);
    
    // Try to auto-map to Homey capability
    this._tryAutoMap(lookupKey, value);
  }

  _tryAutoMap(lookupKey, value) {
    const mapping = ZCL_AUTO_MAP[lookupKey];
    if (!mapping) return;

    if (!this.device.hasCapability(mapping.cap)) {
      this.device.log(`[RAW-FALLBACK] ⚠️ Device lacks capability ${mapping.cap} for ${lookupKey}`);
      return;
    }

    let finalValue = value;
    
    if (mapping.div) {
      finalValue = value / mapping.div;
    } else if (mapping.fn === 'bool') {
      finalValue = Boolean(value);
    } else if (mapping.fn === 'lux') {
      finalValue = Math.max(0, Math.round(Math.pow(10, (value - 1) / 10000)));
    } else if (mapping.fn === 'voltage') {
      const volts = value / 10;
      finalValue = Math.min(100, Math.max(0, Math.round(((volts - 2.2) / 0.8) * 100)));
    } else if (mapping.fn === 'doorlock') {
      // ZCL DoorLock lockState: 0=not locked, 1=locked, 2=unlocked
      finalValue = value === 1;
    } else if (mapping.fn === 'mireds') {
      // Color temp mireds → 0..1 scale (153-500 mireds typical)
      finalValue = Math.min(1, Math.max(0, (value - 153) / (500 - 153)));
    } else if (mapping.fn === 'ias_zone') {
      // IAS Zone status bit 0 = alarm1 (contact/tamper)
      finalValue = Boolean(value & 0x01);
    } else if (mapping.fn === 'enum') {
      finalValue = value;
    }

    this.device.log(`[RAW-FALLBACK] 🪄 Auto-mapped: ${lookupKey} -> ${mapping.cap} = ${finalValue}`);
    this.device.setCapabilityValue(mapping.cap, finalValue).catch(e => {
      this.device.log(`[RAW-FALLBACK] ❌ Set capability failed: ${e.message}`);
    });
  }

  _scheduleSummary() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this._writeSummary(), 10000);
  }

  _writeSummary() {
    if (this.discovered.length === 0) return;
    this.device.log('=== RAW CLUSTER FALLBACK SUMMARY ===');
    this.device.log(`Tracking ${this.discovered.length} unhandled clusters:`);
    this.discovered.forEach(d => {
      this.device.log(` - EP ${d.ep}: ${d.cluster}`);
    });
    this.device.log('====================================');
  }

  getSummary() {
    return this.discovered;
  }

  destroy() {
    if (this.timer) clearTimeout(this.timer);
    this.handled.clear();
  }
}

module.exports = RawClusterFallback;
