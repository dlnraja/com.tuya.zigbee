'use strict';

const { HybridPlugBase } = require('../../lib/devices/HybridPlugBase');
const { getDeviceConfig, transformDpValue, ENERGY_CONFIGS } = require('../../lib/configs/IntelligentDeviceConfig');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      ENERGY MONITOR PLUG - v5.5.255 INTELLIGENT ENERGY MANAGEMENT           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  - Auto-detects energy meter type per manufacturerName                       ║
 * ║  - Supports ZCL (TS011F) and Tuya DP (TS0601) protocols                     ║
 * ║  - Dynamic divisors for power/voltage/current/energy                         ║
 * ║  - Intelligent hybrid mode for mixed protocol devices                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENERGY DEVICE CONFIGURATION DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

const ENERGY_DEVICE_CONFIGS = {
  // Type A: Standard Tuya DP Energy (TS0601) - DP 17/18/19/20
  'TUYA_DP_STANDARD': {
    sensors: [
      '_TZE200_byzdayie', '_TZE200_fsb6zw01', '_TZE200_ewxhg6o9',
      '_TZE204_byzdayie', '_TZE204_fsb6zw01',
    ],
    protocol: 'tuya',
    dpMap: {
      1: { cap: 'onoff', type: 'bool' },
      17: { cap: 'measure_current', divisor: 1000 },     // mA -> A
      18: { cap: 'measure_power', divisor: 10 },         // dW -> W
      19: { cap: 'measure_voltage', divisor: 10 },       // dV -> V
      20: { cap: 'meter_power', divisor: 100 },          // Wh*100 -> kWh
    }
  },

  // Type B: Tuya DP Alt Energy - DP 9/16/17/18/19
  'TUYA_DP_ALT': {
    sensors: [
      '_TZE200_bkkmqmyo', '_TZE200_eaac7dkw', '_TZE204_bkkmqmyo',
      '_TZE200_lsanae15', '_TZE204_lsanae15', '_TZE200_tz32mtza',
    ],
    protocol: 'tuya',
    dpMap: {
      1: { cap: 'onoff', type: 'bool' },
      9: { cap: 'meter_power', divisor: 100 },           // Total energy
      16: { cap: 'onoff', type: 'bool' },                // Switch state alt
      17: { cap: 'meter_power', divisor: 100 },          // Energy channel
      18: { cap: 'measure_power', divisor: 10 },         // Power
      19: { cap: 'measure_current', divisor: 1000 },     // Current mA
      20: { cap: 'measure_voltage', divisor: 10 },       // Voltage
    }
  },

  // Type C: ZCL Electrical Measurement (TS011F standard)
  'ZCL_ELECTRICAL': {
    sensors: [
      '_TZ3000_cphmq0q7', '_TZ3000_dpo1ysak', '_TZ3000_ew3ldmgx',
      '_TZ3000_gjnozsaz', '_TZ3000_gvn91tmx', '_TZ3000_hkuahi4e',
      '_TZ3000_iv6ph5tr', '_TZ3000_jvovfwyk', '_TZ3000_kdi2o9m6',
      '_TZ3000_mlswgkc3', '_TZ3000_okaz9tjs', '_TZ3000_ps3dmato',
      '_TZ3000_qeuvnohg', '_TZ3000_rdtixbnu', '_TZ3000_typdpbpg',
      '_TZ3000_upjrsxh1', '_TZ3000_w0qqde0g', '_TZ3000_waho4ber',
      '_TZ3000_zloso4jk', '_TZ3000_5f43h46b', '_TZ3000_cehuw1lw',
      '_TZ3000_g5xawfcq', '_TZ3000_hdopuwv6', '_TZ3000_mraovvmm',
      '_TZ3000_ss98ec5d', '_TZ3000_uwkja6z1', '_TZ3000_yujkchbz',
    ],
    protocol: 'zcl',
    clusters: {
      electrical: 0x0B04,
      metering: 0x0702,
    },
    zclAttrs: {
      power: { cluster: 0x0B04, attr: 'activePower', divisor: 10 },
      voltage: { cluster: 0x0B04, attr: 'rmsVoltage', divisor: 10 },
      current: { cluster: 0x0B04, attr: 'rmsCurrent', divisor: 1000 },
      energy: { cluster: 0x0702, attr: 'currentSummDelivered', divisor: 100 },
    }
  },

  // Type D: ZCL with different divisors (Silvercrest/Lidl)
  'ZCL_SILVERCREST': {
    sensors: [
      '_TZ3000_1obwwnmq', '_TZ3000_vtscrpmw', '_TZ3000_ksw8qtmt',
      '_TZ3000_u5u4cakc',
    ],
    protocol: 'zcl',
    clusters: {
      electrical: 0x0B04,
    },
    zclAttrs: {
      power: { cluster: 0x0B04, attr: 'activePower', divisor: 1 },    // No divisor
      voltage: { cluster: 0x0B04, attr: 'rmsVoltage', divisor: 10 },
      current: { cluster: 0x0B04, attr: 'rmsCurrent', divisor: 1000 },
    }
  },

  // Type E: BlitzWolf / Nous style (different DP order)
  'TUYA_BLITZWOLF': {
    sensors: [
      '_TZE200_nkjintbl', '_TZE200_wfxuhoea', '_TZE204_nkjintbl',
    ],
    protocol: 'tuya',
    dpMap: {
      1: { cap: 'onoff', type: 'bool' },
      9: { cap: 'meter_power', divisor: 100 },
      17: { cap: 'measure_voltage', divisor: 10 },       // Voltage first
      18: { cap: 'measure_current', divisor: 1000 },     // Then current
      19: { cap: 'measure_power', divisor: 10 },         // Then power
    }
  },

  // Type F: 3-Phase Energy Meter
  'TUYA_3PHASE': {
    sensors: [
      '_TZE200_nphsqjnz', '_TZE204_nphsqjnz', '_TZE200_v9hkz2up',
    ],
    protocol: 'tuya',
    dpMap: {
      1: { cap: 'onoff', type: 'bool' },
      6: { cap: null, internal: 'report_interval' },
      101: { cap: 'measure_power', divisor: 10 },        // Total power
      102: { cap: 'measure_power.phase_a', divisor: 10 },
      103: { cap: 'measure_power.phase_b', divisor: 10 },
      104: { cap: 'measure_power.phase_c', divisor: 10 },
      105: { cap: 'measure_voltage', divisor: 10 },
      106: { cap: 'measure_voltage.phase_a', divisor: 10 },
      107: { cap: 'measure_voltage.phase_b', divisor: 10 },
      108: { cap: 'measure_voltage.phase_c', divisor: 10 },
      109: { cap: 'meter_power', divisor: 100 },
    }
  },
};

// Build manufacturer -> config lookup
const ENERGY_CONFIG_MAP = {};
for (const [configName, config] of Object.entries(ENERGY_DEVICE_CONFIGS)) {
  for (const mfr of (config.sensors || [])) {
    ENERGY_CONFIG_MAP[mfr] = { ...config, configName };
  }
}

// Get config for manufacturer
function getEnergyConfig(manufacturerName) {
  return ENERGY_CONFIG_MAP[manufacturerName] || ENERGY_DEVICE_CONFIGS.TUYA_DP_STANDARD;
}

class EnergyMonitorPlugDevice extends HybridPlugBase {

  /**
   * v5.5.255: Get energy device configuration
   */
  _getEnergyConfig() {
    if (!this._energyConfig) {
      const mfr = this.getData()?.manufacturerName || '';
      this._energyConfig = getEnergyConfig(mfr);
    }
    return this._energyConfig;
  }

  /**
   * v5.5.255: Dynamic capabilities based on config
   */
  get plugCapabilities() {
    const config = this._getEnergyConfig();
    const caps = ['onoff'];

    // Add capabilities from DP mappings
    if (config.dpMap) {
      for (const dp of Object.values(config.dpMap)) {
        if (dp.cap && !caps.includes(dp.cap) && !dp.cap.includes('.')) {
          caps.push(dp.cap);
        }
      }
    }

    // Add capabilities from ZCL attributes
    if (config.zclAttrs) {
      const attrToCap = {
        power: 'measure_power',
        voltage: 'measure_voltage',
        current: 'measure_current',
        energy: 'meter_power',
      };
      for (const [attr, capName] of Object.entries(attrToCap)) {
        if (config.zclAttrs[attr] && !caps.includes(capName)) {
          caps.push(capName);
        }
      }
    }

    // Ensure energy capabilities are present
    const energyCaps = ['measure_power', 'meter_power', 'measure_voltage', 'measure_current'];
    for (const cap of energyCaps) {
      if (!caps.includes(cap)) {
        caps.push(cap);
      }
    }

    return caps;
  }

  /**
   * v5.5.255: INTELLIGENT DP MAPPINGS from config database
   */
  get dpMappings() {
    const config = this._getEnergyConfig();
    const mfr = this.getData()?.manufacturerName || '';

    if (config.protocol === 'zcl') {
      // ZCL devices use cluster attributes, not DP mappings
      // Return minimal DP map for fallback
      return {
        1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      };
    }

    // Build DP mappings from config
    const mappings = {};
    const dpMap = config.dpMap || {};

    for (const [dpId, dpConfig] of Object.entries(dpMap)) {
      const dp = parseInt(dpId);

      if (dpConfig.type === 'bool') {
        mappings[dp] = {
          capability: dpConfig.cap,
          transform: (v) => v === 1 || v === true,
        };
      } else if (dpConfig.cap) {
        mappings[dp] = {
          capability: dpConfig.cap,
          divisor: dpConfig.divisor || 1,
        };
      } else if (dpConfig.internal) {
        mappings[dp] = {
          capability: null,
          internal: dpConfig.internal,
        };
      }
    }

    return mappings;
  }

  async onNodeInit({ zclNode }) {
    const mfr = this.getData()?.manufacturerName || '';
    const config = this._getEnergyConfig();

    this.log(`[ENERGY] ═══════════════════════════════════════════════════════`);
    this.log(`[ENERGY] v5.5.255 INTELLIGENT ENERGY MANAGEMENT`);
    this.log(`[ENERGY] ManufacturerName: ${mfr}`);
    this.log(`[ENERGY] Config: ${config.configName || 'TUYA_DP_STANDARD (default)'}`);
    this.log(`[ENERGY] Protocol: ${config.protocol || 'hybrid'}`);
    this.log(`[ENERGY] ═══════════════════════════════════════════════════════`);

    // Initialize base class
    await super.onNodeInit({ zclNode });

    // Setup protocol-specific listeners
    if (config.protocol === 'zcl') {
      await this._setupZclEnergy(zclNode, config);
    }

    this.log('[ENERGY] ✅ Energy monitor plug ready');
  }

  /**
   * v5.5.255: Setup ZCL energy clusters with intelligent divisors
   */
  async _setupZclEnergy(zclNode, config) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    const zclAttrs = config.zclAttrs || {};

    // Electrical Measurement Cluster (0x0B04)
    try {
      const elecCluster = ep1.clusters?.electricalMeasurement;
      if (elecCluster?.on) {
        // Power
        if (zclAttrs.power) {
          elecCluster.on('attr.activePower', (value) => {
            const power = value / (zclAttrs.power.divisor || 1);
            this.log(`[ENERGY-ZCL] Power: ${power}W`);
            this.setCapabilityValue('measure_power', parseFloat(Math.max(0, power))).catch(() => { });
          });
        }

        // Voltage
        if (zclAttrs.voltage) {
          elecCluster.on('attr.rmsVoltage', (value) => {
            const voltage = value / (zclAttrs.voltage.divisor || 1);
            this.log(`[ENERGY-ZCL] Voltage: ${voltage}V`);
            this.setCapabilityValue('measure_voltage', parseFloat(voltage)).catch(() => { });
          });
        }

        // Current
        if (zclAttrs.current) {
          elecCluster.on('attr.rmsCurrent', (value) => {
            const current = value / (zclAttrs.current.divisor || 1);
            this.log(`[ENERGY-ZCL] Current: ${current}A`);
            this.setCapabilityValue('measure_current', parseFloat(current)).catch(() => { });
          });
        }

        this.log('[ENERGY] ✅ ZCL Electrical Measurement configured');
      }
    } catch (e) {
      this.log(`[ENERGY] ⚠️ Electrical cluster error: ${e.message}`);
    }

    // Metering Cluster (0x0702)
    try {
      const meterCluster = ep1.clusters?.metering;
      if (meterCluster?.on && zclAttrs.energy) {
        meterCluster.on('attr.currentSummDelivered', (value) => {
          // Value is usually a 48-bit integer, take lower 32 bits
          const rawValue = typeof value === 'object' ? value[0] || 0 : value;
          const energy = rawValue / (zclAttrs.energy.divisor || 1);
          this.log(`[ENERGY-ZCL] Energy: ${energy}kWh`);
          this.setCapabilityValue('meter_power', parseFloat(energy)).catch(() => { });
        });
        this.log('[ENERGY] ✅ ZCL Metering configured');
      }
    } catch (e) {
      this.log(`[ENERGY] ⚠️ Metering cluster error: ${e.message}`);
    }
  }
}

module.exports = EnergyMonitorPlugDevice;
