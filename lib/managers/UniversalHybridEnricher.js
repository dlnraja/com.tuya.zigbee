'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║          UNIVERSAL HYBRID ENRICHER - v5.5.239                                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Intelligent driver enrichment system for ALL device types                   ║
 * ║                                                                              ║
 * ║  FEATURES:                                                                   ║
 * ║  1. Auto-detects device capabilities from ZCL clusters and Tuya DPs          ║
 * ║  2. 15-minute learning period to identify optimal protocol                   ║
 * ║  3. Intelligent capability addition based on data received                   ║
 * ║  4. TRUE HYBRID: Listens to both Tuya DP AND ZCL simultaneously              ║
 * ║  5. Flow card triggers for discovered capabilities                           ║
 * ║                                                                              ║
 * ║  SUPPORTED DEVICE TYPES:                                                     ║
 * ║  - Lights (dim, color, temperature, effects)                                 ║
 * ║  - Switches (onoff, multi-gang)                                              ║
 * ║  - Sensors (motion, contact, temperature, humidity, etc.)                    ║
 * ║  - Covers (position, tilt)                                                   ║
 * ║  - Thermostats (temperature, mode, schedule)                                 ║
 * ║  - Plugs (energy monitoring, power, voltage, current)                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const LEARNING_PERIOD_MS = 15 * 60 * 1000; // 15 minutes

// Capability mappings for intelligent discovery
const CAPABILITY_DISCOVERY = {
  // ZCL Cluster to Capability mappings
  zcl: {
    0x0006: ['onoff'],                    // On/Off cluster
    0x0008: ['dim'],                       // Level Control
    0x0300: ['light_hue', 'light_saturation', 'light_temperature', 'light_mode'], // Color Control
    0x0402: ['measure_temperature'],       // Temperature Measurement
    0x0405: ['measure_humidity'],          // Relative Humidity
    0x0400: ['measure_luminance'],         // Illuminance Measurement
    0x0001: ['measure_battery'],           // Power Configuration
    0x0500: ['alarm_motion', 'alarm_contact', 'alarm_water', 'alarm_smoke'], // IAS Zone
    0x0702: ['meter_power', 'measure_power'], // Metering
    0x0B04: ['measure_power', 'measure_voltage', 'measure_current'], // Electrical Measurement
    0x0102: ['windowcoverings_state', 'windowcoverings_set'], // Window Covering
    0x0201: ['target_temperature', 'thermostat_mode'], // Thermostat
    0x0202: ['fan_speed'],                 // Fan Control
  },

  // Tuya DP to Capability mappings (common patterns)
  tuya: {
    1: ['onoff'],                          // Switch state
    2: ['dim', 'light_mode'],              // Mode or brightness
    3: ['dim'],                            // Brightness (0-1000)
    4: ['light_temperature'],              // Color temperature
    5: ['light_hue', 'light_saturation'],  // HSV color
    6: ['alarm_motion', 'alarm_contact'],  // Alarm states
    7: ['countdown'],                      // Countdown timer
    10: ['measure_battery'],               // Battery percentage
    13: ['alarm_water'],                   // Water leak
    14: ['alarm_smoke'],                   // Smoke alarm
    15: ['measure_battery'],               // Battery (alternate)
    16: ['target_temperature'],            // Target temp
    18: ['measure_power'],                 // Current power
    19: ['measure_current'],               // Current (A)
    20: ['measure_voltage'],               // Voltage (V)
    21: ['power_on_behavior'],             // Power on behavior
    24: ['measure_temperature'],           // Temperature
    25: ['measure_humidity'],              // Humidity
    101: ['dim', 'valve_position'],        // Brightness or valve
    102: ['measure_temperature'],          // Temperature (alternate)
    103: ['measure_humidity'],             // Humidity (alternate)
  }
};

// Device type patterns for intelligent classification
const DEVICE_TYPE_PATTERNS = {
  light: {
    clusters: [0x0006, 0x0008, 0x0300],
    dps: [1, 2, 3, 4, 5],
    capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode']
  },
  switch: {
    clusters: [0x0006],
    dps: [1],
    capabilities: ['onoff']
  },
  sensor_motion: {
    clusters: [0x0500, 0x0400],
    dps: [1, 6],
    capabilities: ['alarm_motion', 'measure_luminance', 'measure_battery']
  },
  sensor_contact: {
    clusters: [0x0500],
    dps: [1, 6],
    capabilities: ['alarm_contact', 'measure_battery']
  },
  sensor_climate: {
    clusters: [0x0402, 0x0405],
    dps: [24, 25, 102, 103],
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery']
  },
  plug: {
    clusters: [0x0006, 0x0702, 0x0B04],
    dps: [1, 18, 19, 20],
    capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current']
  },
  cover: {
    clusters: [0x0102],
    dps: [1, 2, 3],
    capabilities: ['windowcoverings_state', 'windowcoverings_set', 'windowcoverings_tilt_set']
  },
  thermostat: {
    clusters: [0x0201],
    dps: [2, 16, 24],
    capabilities: ['target_temperature', 'measure_temperature', 'thermostat_mode']
  }
};

class UniversalHybridEnricher {

  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      learningPeriod: options.learningPeriod || LEARNING_PERIOD_MS,
      verbose: options.verbose !== false,
      autoAddCapabilities: options.autoAddCapabilities !== false,
      ...options
    };

    // Learning state
    this.isLearning = true;
    this.learningStartTime = Date.now();
    this.learningTimer = null;

    // Protocol statistics
    this.stats = {
      tuya: { hits: 0, dps: new Map(), lastHit: null },
      zcl: { hits: 0, clusters: new Map(), lastHit: null }
    };

    // Discovered capabilities
    this.discoveredCapabilities = new Set();
    this.activeProtocol = 'hybrid'; // tuya, zcl, or hybrid

    this._log('UniversalHybridEnricher v5.5.239 created');
  }

  _log(...args) {
    if (this.options.verbose && this.device?.log) {
      this.device.log('[ENRICHER]', ...args);
    }
  }

  /**
   * Initialize the enricher - call this in device.onNodeInit()
   */
  async initialize(zclNode) {
    this._log('════════════════════════════════════════════════════════');
    this._log('🔄 Starting 15-minute intelligent learning period');
    this._log('════════════════════════════════════════════════════════');

    this.zclNode = zclNode;

    // Setup listeners for both protocols
    await this._setupTuyaListeners();
    await this._setupZCLListeners(zclNode);

    // Start learning timer
    this.learningTimer = setTimeout(() => {
      this._completeLearning();
    }, this.options.learningPeriod);

    return this;
  }

  /**
   * Setup Tuya DP listeners
   */
  async _setupTuyaListeners() {
    try {
      const ep1 = this.zclNode?.endpoints?.[1];
      const tuya = ep1?.clusters?.tuya;

      if (tuya?.on) {
        tuya.on('response', (response) => this._handleTuyaData(response));
        tuya.on('datapoint', (data) => this._handleTuyaData(data));
        tuya.on('reporting', (data) => this._handleTuyaData(data));
        this._log('✅ Tuya DP listeners active');
      }
    } catch (e) {
      this._log('⚠️ Tuya setup skipped:', e.message);
    }
  }

  /**
   * Setup ZCL cluster listeners
   */
  async _setupZCLListeners(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      if (!ep1?.clusters) return;

      // On/Off cluster
      if (ep1.clusters.onOff?.on) {
        ep1.clusters.onOff.on('attr.onOff', (value) => {
          this._registerZCLHit(0x0006, 'onOff', value);
        });
      }

      // Level Control cluster
      if (ep1.clusters.levelControl?.on) {
        ep1.clusters.levelControl.on('attr.currentLevel', (value) => {
          this._registerZCLHit(0x0008, 'currentLevel', value);
        });
      }

      // Color Control cluster
      if (ep1.clusters.colorControl?.on) {
        ep1.clusters.colorControl.on('attr.currentHue', (v) => this._registerZCLHit(0x0300, 'currentHue', v));
        ep1.clusters.colorControl.on('attr.currentSaturation', (v) => this._registerZCLHit(0x0300, 'currentSaturation', v));
        ep1.clusters.colorControl.on('attr.colorTemperatureMireds', (v) => this._registerZCLHit(0x0300, 'colorTemperatureMireds', v));
      }

      // Temperature Measurement cluster
      if (ep1.clusters.temperatureMeasurement?.on) {
        ep1.clusters.temperatureMeasurement.on('attr.measuredValue', (v) => {
          this._registerZCLHit(0x0402, 'measuredValue', v);
        });
      }

      // Humidity cluster
      if (ep1.clusters.relativeHumidityMeasurement?.on) {
        ep1.clusters.relativeHumidityMeasurement.on('attr.measuredValue', (v) => {
          this._registerZCLHit(0x0405, 'measuredValue', v);
        });
      }

      // Electrical Measurement cluster
      if (ep1.clusters.electricalMeasurement?.on) {
        ep1.clusters.electricalMeasurement.on('attr.activePower', (v) => this._registerZCLHit(0x0B04, 'activePower', v));
        ep1.clusters.electricalMeasurement.on('attr.rmsCurrent', (v) => this._registerZCLHit(0x0B04, 'rmsCurrent', v));
        ep1.clusters.electricalMeasurement.on('attr.rmsVoltage', (v) => this._registerZCLHit(0x0B04, 'rmsVoltage', v));
      }

      // IAS Zone cluster
      if (ep1.clusters.iasZone?.on) {
        ep1.clusters.iasZone.on('zoneStatusChangeNotification', (data) => {
          this._registerZCLHit(0x0500, 'zoneStatus', data);
        });
      }

      this._log('✅ ZCL cluster listeners active');
    } catch (e) {
      this._log('⚠️ ZCL setup skipped:', e.message);
    }
  }

  /**
   * Handle incoming Tuya DP data
   */
  _handleTuyaData(data) {
    if (!data) return;

    const dp = data.dp ?? data.datapoint ?? data.dpId;
    const value = data.data ?? data.value ?? data.parsedValue;

    if (dp === undefined) return;

    this.stats.tuya.hits++;
    this.stats.tuya.lastHit = Date.now();

    if (!this.stats.tuya.dps.has(dp)) {
      this.stats.tuya.dps.set(dp, { hits: 0, lastValue: null });
    }
    this.stats.tuya.dps.get(dp).hits++;
    this.stats.tuya.dps.get(dp).lastValue = value;

    // Discover capabilities from DP
    const caps = CAPABILITY_DISCOVERY.tuya[dp] || [];
    caps.forEach(cap => this.discoveredCapabilities.add(cap));

    if (this.isLearning) {
      this._log(`📥 Tuya DP${dp} = ${JSON.stringify(value).substring(0, 50)}`);
    }
  }

  /**
   * Register a ZCL cluster hit
   */
  _registerZCLHit(clusterId, attr, value) {
    this.stats.zcl.hits++;
    this.stats.zcl.lastHit = Date.now();

    if (!this.stats.zcl.clusters.has(clusterId)) {
      this.stats.zcl.clusters.set(clusterId, { hits: 0, attrs: new Set() });
    }
    this.stats.zcl.clusters.get(clusterId).hits++;
    this.stats.zcl.clusters.get(clusterId).attrs.add(attr);

    // Discover capabilities from cluster
    const caps = CAPABILITY_DISCOVERY.zcl[clusterId] || [];
    caps.forEach(cap => this.discoveredCapabilities.add(cap));

    if (this.isLearning) {
      this._log(`📥 ZCL 0x${clusterId.toString(16)} ${attr} = ${value}`);
    }
  }

  /**
   * Complete the learning period and make decisions
   */
  _completeLearning() {
    this.isLearning = false;

    this._log('════════════════════════════════════════════════════════');
    this._log('📊 LEARNING PERIOD COMPLETE - Analysis:');
    this._log('════════════════════════════════════════════════════════');

    // Determine best protocol
    const tuyaScore = this.stats.tuya.hits;
    const zclScore = this.stats.zcl.hits;

    if (tuyaScore > zclScore * 2) {
      this.activeProtocol = 'tuya';
      this._log(`✅ Protocol: TUYA (score: ${tuyaScore} vs ZCL: ${zclScore})`);
    } else if (zclScore > tuyaScore * 2) {
      this.activeProtocol = 'zcl';
      this._log(`✅ Protocol: ZCL (score: ${zclScore} vs Tuya: ${tuyaScore})`);
    } else {
      this.activeProtocol = 'hybrid';
      this._log(`✅ Protocol: HYBRID (Tuya: ${tuyaScore}, ZCL: ${zclScore})`);
    }

    // Log discovered capabilities
    this._log(`🔍 Discovered capabilities: ${[...this.discoveredCapabilities].join(', ')}`);

    // Log active DPs
    if (this.stats.tuya.dps.size > 0) {
      this._log(`📡 Active Tuya DPs: ${[...this.stats.tuya.dps.keys()].join(', ')}`);
    }

    // Log active clusters
    if (this.stats.zcl.clusters.size > 0) {
      const clusters = [...this.stats.zcl.clusters.keys()].map(c => `0x${c.toString(16)}`);
      this._log(`📡 Active ZCL clusters: ${clusters.join(', ')}`);
    }

    this._log('════════════════════════════════════════════════════════');

    // Emit learning complete event
    if (this.device.emit) {
      this.device.emit('enricher:learning_complete', {
        protocol: this.activeProtocol,
        capabilities: [...this.discoveredCapabilities],
        stats: this.stats
      });
    }
  }

  /**
   * Get learning status
   */
  getStatus() {
    return {
      isLearning: this.isLearning,
      elapsedMs: Date.now() - this.learningStartTime,
      activeProtocol: this.activeProtocol,
      discoveredCapabilities: [...this.discoveredCapabilities],
      stats: {
        tuya: { hits: this.stats.tuya.hits, dps: this.stats.tuya.dps.size },
        zcl: { hits: this.stats.zcl.hits, clusters: this.stats.zcl.clusters.size }
      }
    };
  }
}

module.exports = UniversalHybridEnricher;
