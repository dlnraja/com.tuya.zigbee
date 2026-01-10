'use strict';

/**
 * HYBRID DRIVER SYSTEM - Revolutionary Auto-Adaptive Drivers
 *
 * Inspired by: IKEA Trådfri, Philips Hue, Xiaomi Mi, Tuya Official
 *
 * PHILOSOPHY:
 * - ONE driver adapts to ALL device variants
 * - Auto-detects capabilities from clusters/endpoints
 * - Smart energy management (AC vs Battery vs Hybrid)
 * - Real-time adaptation
 * - Zero user configuration
 *
 * PATTERNS FROM BEST APPS:
 * - IKEA: Simple, reliable, cluster-based
 * - Philips: Rich capabilities, good UX
 * - Xiaomi: Battery-efficient, smart reporting
 * - Tuya: Wide compatibility, DP protocol
 */

const { ZigBeeDevice } = require('homey-zigbeedriver');

class HybridDriverSystem {

  /**
   * Device type detection patterns
   * Based on clusters, endpoints, model IDs
   */
  static DEVICE_PATTERNS = {
    // Lights (IKEA/Philips patterns)
    LIGHT: {
      clusters: [6, 8],  // OnOff + LevelControl
      optional: [0x0300], // ColorControl
      class: 'light',
      capabilities: ['onoff', 'dim'],
      energy: 'AC'
    },

    LIGHT_COLOR: {
      clusters: [6, 8, 0x0300],
      class: 'light',
      capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'],
      energy: 'AC'
    },

    // Switches (Tuya patterns)
    SWITCH: {
      clusters: [6],  // OnOff only
      noCluster: [8], // No LevelControl
      class: 'socket',
      capabilities: ['onoff'],
      energy: 'AC',
      variants: {
        '1gang': { endpoints: 1 },
        '2gang': { endpoints: 2 },
        '3gang': { endpoints: 3 },
        '4gang': { endpoints: 4 },
        '6gang': { endpoints: 6 },
        '8gang': { endpoints: 8 }
      }
    },

    // Plugs (Energy monitoring)
    PLUG: {
      clusters: [6, 0x0702, 0x0B04],  // OnOff + Metering + Electrical
      class: 'socket',
      capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
      energy: 'AC'
    },

    // Buttons/Remotes (IKEA Trådfri patterns)
    BUTTON: {
      clusters: [6],  // OnOff commands
      isController: true,
      class: 'button',
      capabilities: ['measure_battery'],
      energy: 'BATTERY',
      flowOnly: true,  // No controllable capabilities
      variants: {
        '1button': { endpoints: 1 },
        '2button': { endpoints: 2 },
        '3button': { endpoints: 3 },
        '4button': { endpoints: 4 },
        '6button': { endpoints: 6 }
      }
    },

    // Sensors (Xiaomi patterns)
    MOTION: {
      clusters: [0x0406],  // OccupancySensing
      class: 'sensor',
      capabilities: ['alarm_motion', 'measure_battery'],
      energy: 'BATTERY'
    },

    CONTACT: {
      clusters: [0x0500],  // IASZone
      class: 'sensor',
      capabilities: ['alarm_contact', 'measure_battery'],
      energy: 'BATTERY'
    },

    CLIMATE: {
      clusters: [0x0402, 0x0405],  // Temperature + Humidity
      class: 'sensor',
      capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
      energy: 'BATTERY'
    },

    // Tuya DP Devices
    TUYA_DP: {
      clusters: [0xEF00],
      class: 'sensor',  // Default, will auto-detect
      capabilities: [],  // Auto-detected from DP map
      energy: 'MIXED',   // Can be AC or Battery
      requiresDpMap: true
    },

    // Dimmers
    DIMMER: {
      clusters: [6, 8],
      noCluster: [0x0300],  // No color
      class: 'light',
      capabilities: ['onoff', 'dim'],
      energy: 'AC'
    },

    // Curtains/Blinds
    CURTAIN: {
      clusters: [0x0102],  // WindowCovering
      class: 'curtain',
      capabilities: ['windowcoverings_state', 'dim'],
      energy: 'MIXED'
    },

    // Thermostats
    THERMOSTAT: {
      clusters: [0x0201],  // Thermostat
      class: 'thermostat',
      capabilities: ['target_temperature', 'measure_temperature', 'thermostat_mode'],
      energy: 'BATTERY'
    },

    // Locks
    LOCK: {
      clusters: [0x0101],  // DoorLock
      class: 'lock',
      capabilities: ['locked', 'measure_battery'],
      energy: 'BATTERY'
    },

    // Sirens
    SIREN: {
      clusters: [0x0502],  // IAS WD
      class: 'other',
      capabilities: ['onoff', 'alarm_generic'],
      energy: 'MIXED'
    }
  };

  /**
   * Energy management strategies
   * Based on power source
   */
  static ENERGY_STRATEGIES = {
    AC: {
      polling: {
        default: 30000,  // 30s for AC powered
        power: 5000,     // 5s for power readings
        state: 10000     // 10s for state
      },
      reporting: {
        min: 1,
        max: 300,
        change: 1
      },
      batteryMonitoring: false
    },

    BATTERY: {
      polling: {
        default: 3600000,  // 1h for battery
        motion: 14400000,  // 4h for motion sensors
        contact: 14400000, // 4h for contact sensors
        climate: 7200000,  // 2h for climate sensors
        button: 21600000   // 6h for buttons
      },
      reporting: {
        min: 300,   // 5min minimum
        max: 3600,  // 1h maximum
        change: 5   // Larger change threshold
      },
      batteryMonitoring: true,
      deepSleep: true
    },

    MIXED: {
      // Detect at runtime (curtains, plugs with battery backup)
      polling: {
        default: 60000  // 1min
      },
      reporting: {
        min: 10,
        max: 600,
        change: 2
      },
      batteryMonitoring: true,
      adaptivePolling: true
    },

    HYBRID: {
      // Solar + battery, supercapacitor, etc.
      polling: {
        default: 120000  // 2min
      },
      reporting: {
        min: 30,
        max: 900,
        change: 3
      },
      batteryMonitoring: true,
      solarMonitoring: true,
      adaptivePolling: true
    }
  };

  /**
   * Detect device type from zigbee node
   */
  static detectDeviceType(zclNode) {
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) return null;

    const clusters = Object.keys(endpoint.clusters || {}).map(c => {
      return typeof c === 'number' ? c : this.getClusterNumber(c);
    });

    const endpointCount = Object.keys(zclNode.endpoints).length;

    // Check each pattern
    for (const [type, pattern] of Object.entries(this.DEVICE_PATTERNS)) {
      if (this.matchesPattern(clusters, endpointCount, pattern)) {
        return {
          type,
          pattern,
          endpointCount,
          clusters
        };
      }
    }

    return null;
  }

  /**
   * Check if clusters match pattern
   */
  static matchesPattern(clusters, endpointCount, pattern) {
    // Required clusters must ALL be present
    if (pattern.clusters) {
      const hasAll = pattern.clusters.every(c => clusters.includes(c));
      if (!hasAll) return false;
    }

    // Excluded clusters must NOT be present
    if (pattern.noCluster) {
      const hasExcluded = pattern.noCluster.some(c => clusters.includes(c));
      if (hasExcluded) return false;
    }

    // Controller check
    if (pattern.isController) {
      // Controllers typically have client clusters only
      // This is a simplified check
      return true;
    }

    return true;
  }

  /**
   * Get cluster number from name
   */
  static getClusterNumber(name) {
    const map = {
      'basic': 0,
      'powerConfiguration': 1,
      'identify': 3,
      'groups': 4,
      'scenes': 5,
      'onOff': 6,
      'levelControl': 8,
      'doorLock': 0x0101,
      'windowCovering': 0x0102,
      'thermostat': 0x0201,
      'colorControl': 0x0300,
      'temperatureMeasurement': 0x0402,
      'relativeHumidity': 0x0405,
      'occupancySensing': 0x0406,
      'iasZone': 0x0500,
      'iasWd': 0x0502,
      'metering': 0x0702,
      'electricalMeasurement': 0x0B04,
      'tuyaSpecific': 0xEF00
    };

    return map[name] || name;
  }

  /**
   * Detect energy source
   */
  static detectEnergySource(zclNode, deviceType) {
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) return 'AC';

    // Has power configuration cluster = likely battery
    if (endpoint.clusters?.powerConfiguration) {
      return 'BATTERY';
    }

    // Has metering = AC powered
    if (endpoint.clusters?.metering || endpoint.clusters?.electricalMeasurement) {
      return 'AC';
    }

    // Use pattern default
    if (deviceType?.pattern?.energy) {
      return deviceType.pattern.energy;
    }

    return 'AC';  // Default to AC if unknown
  }

  /**
   * Build capabilities list for device
   */
  static buildCapabilities(deviceType, energySource, tuyaDpMap = null) {
    let capabilities = [];

    if (deviceType?.pattern?.capabilities) {
      capabilities = [...deviceType.pattern.capabilities];
    }

    // Add battery if battery powered
    if (energySource === 'BATTERY' || energySource === 'MIXED') {
      if (!capabilities.includes('measure_battery')) {
        capabilities.push('measure_battery');
      }
    }

    // Tuya DP: build from DP map
    if (deviceType?.pattern?.requiresDpMap && tuyaDpMap) {
      const dpCapabilities = Object.values(tuyaDpMap).map(m => m.capability);
      capabilities = [...new Set([...capabilities, ...dpCapabilities])];
    }

    return capabilities;
  }

  /**
   * Get energy strategy for device
   */
  static getEnergyStrategy(energySource, deviceType) {
    const strategy = this.ENERGY_STRATEGIES[energySource] || this.ENERGY_STRATEGIES.AC;

    // Customize based on device type
    if (energySource === 'BATTERY' && deviceType) {
      const type = deviceType.type.toLowerCase();
      if (strategy.polling[type]) {
        strategy.polling.default = strategy.polling[type];
      }
    }

    return strategy;
  }

  /**
   * Create hybrid device instance
   */
  static createHybridDevice(baseClass = ZigBeeDevice) {
    return class HybridDevice extends baseClass {

      async onNodeInit({ zclNode }) {
        // v5.2.94: Guard against double initialization
        if (this._hybridSystemInitialized) {
          this.log('[HYBRID] ⚠️ Already initialized, skipping second init');
          return;
        }
        this._hybridSystemInitialized = true;

        this.log('🚀 Hybrid Driver System initializing...');

        // v5.2.94: Respect forced device type from child class (e.g., ButtonDevice)
        if (this._skipHybridTypeDetection) {
          this.log(`[HYBRID] 🔒 Type detection SKIPPED (forced: ${this._forcedDeviceType || 'none'})`);
          this.deviceType = this._forcedDeviceType ? { type: this._forcedDeviceType } : null;
        } else {
          // Normal detection
          this.deviceType = HybridDriverSystem.detectDeviceType(zclNode);
        }
        this.log('📱 Detected type:', this.deviceType?.type || 'UNKNOWN');

        // Detect energy source
        this.energySource = HybridDriverSystem.detectEnergySource(zclNode, this.deviceType);
        this.log('⚡ Energy source:', this.energySource);

        // Get energy strategy
        this.energyStrategy = HybridDriverSystem.getEnergyStrategy(this.energySource, this.deviceType);
        this.log('🔋 Energy strategy:', this.energyStrategy.polling.default + 'ms polling');

        // Build capabilities
        const tuyaDpMap = this.getTuyaDpMap?.() || null;
        const targetCapabilities = HybridDriverSystem.buildCapabilities(
          this.deviceType,
          this.energySource,
          tuyaDpMap
        );

        this.log('✨ Target capabilities:', targetCapabilities);

        // Sync capabilities
        await this.syncCapabilities(targetCapabilities);

        // Setup device based on type
        await this.setupDeviceByType();

        // Start energy-aware monitoring
        await this.startEnergyAwareMonitoring();

        this.log('✅ Hybrid device ready!');
      }

      /**
       * Sync capabilities with target
       * v5.2.94: Respects _forbiddenCapabilities from child class
       */
      async syncCapabilities(targetCapabilities) {
        const current = this.getCapabilities();
        const forbidden = this._forbiddenCapabilities || [];

        // v5.2.94: Filter out forbidden capabilities
        const filteredTarget = targetCapabilities.filter(cap => {
          if (forbidden.includes(cap)) {
            this.log(`[HYBRID] 🚫 Capability '${cap}' is FORBIDDEN for this device`);
            return false;
          }
          return true;
        });

        // Add missing (only if not forbidden)
        for (const cap of filteredTarget) {
          if (!current.includes(cap)) {
            try {
              await this.addCapability(cap);
              this.log(`➕ Added capability: ${cap}`);
            } catch (err) {
              this.error(`Failed to add ${cap}:`, err.message);
            }
          }
        }

        // Remove extra (only if not in target) - also remove forbidden
        for (const cap of current) {
          const shouldRemove = !filteredTarget.includes(cap) || forbidden.includes(cap);
          if (shouldRemove) {
            try {
              await this.removeCapability(cap);
              this.log(`➖ Removed capability: ${cap}`);
            } catch (err) {
              this.error(`Failed to remove ${cap}:`, err.message);
            }
          }
        }
      }

      /**
       * Setup device based on detected type
       */
      async setupDeviceByType() {
        if (!this.deviceType) return;

        switch (this.deviceType.type) {
        case 'LIGHT':
        case 'LIGHT_COLOR':
          await this.setupLight();
          break;

        case 'SWITCH':
          await this.setupSwitch();
          break;

        case 'PLUG':
          await this.setupPlug();
          break;

        case 'BUTTON':
          await this.setupButton();
          break;

        case 'MOTION':
          await this.setupMotionSensor();
          break;

        case 'CONTACT':
          await this.setupContactSensor();
          break;

        case 'CLIMATE':
          await this.setupClimateSensor();
          break;

        case 'TUYA_DP':
          await this.setupTuyaDp();
          break;

        case 'CURTAIN':
          await this.setupCurtain();
          break;

        case 'THERMOSTAT':
          await this.setupThermostat();
          break;

        default:
          this.log('⚠️ Unknown device type, using basic setup');
          await this.setupBasic();
        }
      }

      /**
       * Energy-aware monitoring
       */
      async startEnergyAwareMonitoring() {
        const interval = this.energyStrategy.polling.default;

        this.monitoringInterval = this.homey.setInterval(async () => {
          await this.refreshDevice();
        }, interval);

        this.log(`🔄 Monitoring started (${interval}ms interval)`);
      }

      /**
       * Refresh device state
       */
      async refreshDevice() {
        // Override in specific device types
        this.log('🔄 Refreshing device...');
      }

      /**
       * Setup methods for each device type
       */
      async setupLight() {
        this.log('💡 Setting up light...');
        // Register onoff, dim, color listeners
        this.registerCapabilityListener('onoff', async (value) => {
          await this.zclNode.endpoints[1].clusters.onOff[value ? 'setOn' : 'setOff']();
        });

        if (this.hasCapability('dim')) {
          this.registerCapabilityListener('dim', async (value) => {
            await this.zclNode.endpoints[1].clusters.levelControl.moveToLevel({
              level: Math.round(value * 254)
            });
          });
        }
      }

      async setupSwitch() {
        this.log('🔌 Setting up switch...');
        // Multi-gang support
        const endpoints = Object.keys(this.zclNode.endpoints);
        for (const ep of endpoints) {
          const epNum = parseInt(ep);
          if (epNum > 0) {
            const cap = epNum === 1 ? 'onoff' : `onoff.${epNum}`;
            if (this.hasCapability(cap)) {
              this.registerCapabilityListener(cap, async (value) => {
                await this.zclNode.endpoints[epNum].clusters.onOff[value ? 'setOn' : 'setOff']();
              });
            }
          }
        }
      }

      async setupPlug() {
        this.log('🔌 Setting up plug with energy monitoring...');
        await this.setupSwitch();  // Same as switch + energy

        // Setup energy monitoring
        if (this.hasCapability('measure_power')) {
          this.registerAttrReportListener('electricalMeasurement', 'activePower', async (value) => {
            await this.setCapabilityValue('measure_power', parseFloat(value));
          }, 1);
        }
      }

      async setupButton() {
        this.log('🎮 Setting up button/remote...');
        // Buttons are controllers - setup scene triggers
        // No controllable capabilities!
      }

      async setupMotionSensor() {
        this.log('👀 Setting up motion sensor...');
        try {
          // SDK3: Use configureAttributeReporting instead of deprecated registerAttrReportListener
          const occupancyCluster = this.zclNode?.endpoints?.[1]?.clusters?.occupancySensing;
          if (occupancyCluster) {
            occupancyCluster.on('attr.occupancy', async (value) => {
              await this.setCapabilityValue('alarm_motion', value?.occupied ?? false).catch(() => { });
            });
          }
        } catch (err) {
          this.log('⚠️ Motion sensor setup skipped:', err.message);
        }
      }

      async setupContactSensor() {
        this.log('🚪 Setting up contact sensor...');
        try {
          // SDK3: Use cluster events instead of deprecated registerAttrReportListener
          const iasZoneCluster = this.zclNode?.endpoints?.[1]?.clusters?.iasZone;
          if (iasZoneCluster) {
            iasZoneCluster.on('attr.zoneStatus', async (value) => {
              await this.setCapabilityValue('alarm_contact', value?.alarm1 ?? false).catch(() => { });
            });
          }
        } catch (err) {
          this.log('⚠️ Contact sensor setup skipped:', err.message);
        }
      }

      async setupClimateSensor() {
        this.log('🌡️ Setting up climate sensor...');
        try {
          // SDK3: Use cluster events instead of deprecated registerAttrReportListener
          const tempCluster = this.zclNode?.endpoints?.[1]?.clusters?.temperatureMeasurement;
          if (tempCluster) {
            tempCluster.on('attr.measuredValue', async (value) => {
              if (value != null) {
                await this.setCapabilityValue('measure_temperature', parseFloat(value) / 100).catch(() => { });
              }
            });
          }

          const humidityCluster = this.zclNode?.endpoints?.[1]?.clusters?.relativeHumidity;
          if (humidityCluster) {
            humidityCluster.on('attr.measuredValue', async (value) => {
              if (value != null) {
                await this.setCapabilityValue('measure_humidity', parseFloat(value) / 100).catch(() => { });
              }
            });
          }
        } catch (err) {
          this.log('⚠️ Climate sensor setup skipped:', err.message);
        }
      }

      async setupTuyaDp() {
        this.log('🔧 Setting up Tuya DP device...');
        try {
          // SDK3: Use cluster events for Tuya DP
          const tuyaCluster = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
          if (tuyaCluster) {
            tuyaCluster.on('datapoint', async (data) => {
              await this.onTuyaData(data);
            });
          }
        } catch (err) {
          this.log('⚠️ Tuya DP setup skipped:', err.message);
        }
      }

      async setupCurtain() {
        this.log('🪟 Setting up curtain...');
        // Window covering setup
      }

      async setupThermostat() {
        this.log('🌡️ Setting up thermostat...');
        // Thermostat setup
      }

      async setupBasic() {
        this.log('⚙️ Basic setup...');
        // Minimal setup for unknown devices
      }

      /**
       * Tuya DP data handler
       */
      async onTuyaData(data) {
        // Override in device
      }

      /**
       * Cleanup
       */
      async onDeleted() {
        if (this.monitoringInterval) {
          this.homey.clearInterval(this.monitoringInterval);
        }
      }
    };
  }
}

module.exports = HybridDriverSystem;
