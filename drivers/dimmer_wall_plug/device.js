'use strict';
const { safeDivide, safeMultiply } = require('../../lib/utils/tuyaUtils.js');

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const { getDeviceConfig, transformDpValue, ENERGY_CONFIGS } = require('../../lib/configs/IntelligentDeviceConfig');
const { setupSonoffEnergy } = require('../../lib/mixins/SonoffEnergyMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * 
 *       ENERGY MONITOR PLUG - v5.5.255 INTELLIGENT ENERGY MANAGEMENT           
 * 
 *   - Auto-detects energy meter type per manufacturerName                       
 *   - Supports ZCL (TS011F) and Tuya DP (TS0601) protocols                     
 *   - Dynamic divisors for power/voltage/current/energy                         
 *   - Intelligent hybrid mode for mixed protocol devices                        
 * 
 */

// 
// ENERGY DEVICE CONFIGURATION DATABASE
// 

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

  // Type C: ZCL Electrical Measurement (TS011F standard + Sonoff)
  'ZCL_ELECTRICAL': {
    sensors: [
      '_TZ3000_cphmq0q7', '_TZ3000_dpo1ysak', '_TZ3000_ew3ldmgx',
      '_TZ3000_gjnozsaz', '_TZ3000_gvn91tmx', '_TZ3000_hkuahi4e',
      '_TZ3000_iv6ph5tr', '_TZ3000_jvovfwyk', '_TZ3000_kdi2o9m6',
      '_TZ3000_mlswgkc3', '_TZ3000_okaz9tjs', '_TZ3000_ps3dmato',
      '_TZ3000_qeuvnohg', '_TZ3000_rdtixbnu', '_TZ3000_typdpbpg',
      '_TZ3000_upjrsxh1', '_TZ3000_w0qqde0g', '_TZ3210_w0qqde0g', '_TZ3000_waho4ber',
      '_TZ3000_zloso4jk', '_TZ3000_5f43h46b', '_TZ3000_cehuw1lw',
      '_TZ3000_g5xawfcq', '_TZ3000_hdopuwv6', '_TZ3000_mraovvmm',
      '_TZ3000_ga5shatp', '_TZ3000_ss98ec5d', '_TZ3000_uwkja6z1', '_TZ3000_yujkchbz',
      '_TZ3000_wzmuk9ai', // Issue #197: Smart Plug current correction
      '_TZ3210_xzhnra8x',  // v5.11.17: Reports in Watts/Volts (divisor 1)
      'SONOFF', 'Sonoff',  // Sonoff S60ZBTPF/S60ZBTPG/S60ZBTPE
      'Zbeacon', 'zbeacon',
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
      6: { cap, internal: 'report_interval' },
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

class EnergyMonitorPlugDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedPlugBase)) {

  // v5.11.25: Override ZCL energy divisors for devices that report in actual units
  get zclEnergyDivisors() {
    const mfr = this.getSetting?.('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
    const directUnitMfrs = ['_TZ3210_xzhnra8x', '_TZ3210_w0qqde0g'];
    const baseDivisors = directUnitMfrs.includes(mfr) 
      ? { power: 1, voltage: 1, current: 1000 }
      : super.zclEnergyDivisors;
      
    // v5.12.0: Allow user settings to override multipliers for ZCL devices
    // User scale works by multiplying the base value.
    // If a scale dropdown isn't set, it defaults to 1 (making no change to base divisor).
    const powerScale = parseFloat(this.getSetting?.('power_scale')) || 1;const voltageScale = parseFloat(this.getSetting?.('voltage_scale')) || 1;const currentScale = parseFloat(this.getSetting?.('current_scale')) || 1;return {
      power: safeDivide(baseDivisors.power, powerScale),
      voltage: safeDivide(baseDivisors.voltage, voltageScale),
      current: safeDivide(baseDivisors.current, currentScale)
    };
  }

  /**
   * v5.5.255: Get energy device configuration
   */
  _getEnergyConfig() {
    if (!this._energyConfig) {
      const mfr = this.getSetting?.('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
      this._energyConfig = getEnergyConfig(mfr );
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
    const mfr = this.getSetting?.('zb_manufacturer_name') || this.getData()?.manufacturerName || '';

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
          internal: dpConfig.internal,
        };
      }
    }

    return mappings;
  }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'activePower',
          minInterval: 10,
          maxInterval: 300,
          minChange: 5,
        },
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'rmsVoltage',
          minInterval: 30,
          maxInterval: 600,
          minChange: 1,
        },
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'rmsCurrent',
          minInterval: 30,
          maxInterval: 600,
          minChange: 10,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    const mfr = this.getSetting?.('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
    const config = this._getEnergyConfig();

    this.log('[ENERGY] ');
    this.log('[ENERGY] v5.5.255 INTELLIGENT ENERGY MANAGEMENT' );
    this.log(`[ENERGY] ManufacturerName: ${mfr}`);
    this.log(`[ENERGY] Config: ${config.configName || 'TUYA_DP_STANDARD (default)'}`);
    this.log(`[ENERGY] Protocol: ${config.protocol || 'hybrid'}`);
    this.log('[ENERGY] ');

    // Initialize base class
    await super.onNodeInit({ zclNode });
    this.initPhysicalButtonDetection(); // rule-19 injected

    // Setup protocol-specific listeners
    if (config.protocol === 'zcl') {
      await this._setupZclEnergy(zclNode, config);
    }

    await setupSonoffEnergy(this, zclNode);

    // Initialize physical and virtual buttons
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();

    this.log('[ENERGY]  Energy monitor plug ready (v5.13.1 + Bidirectional Buttons)');
  }

  /**
   * v5.5.255: Setup ZCL energy clusters with intelligent divisors
   */
  async _setupZclEnergy(zclNode, config) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1 ) return;

    const zclAttrs = config.zclAttrs || {};

    // Electrical Measurement Cluster (0x0B04)
    try {
      const elecCluster = ep1.clusters?.electricalMeasurement;if (elecCluster?.on) {
        // Power
        if (zclAttrs.power ) {
          const pDiv = this.zclEnergyDivisors.power;
          elecCluster.on('attr.activePower', (value) => {
            const power = safeDivide(value, pDiv);
            this.log(`[ENERGY-ZCL] Power: ${power}W (raw=${value} div=${pDiv})`);
            this.setCapabilityValue('measure_power', parseFloat(Math.max(0, power))).catch(() => { });
      });
        }

        // Voltage
        if (zclAttrs.voltage) {
          const vDiv = this.zclEnergyDivisors.voltage;
          elecCluster.on('attr.rmsVoltage', (value) => {
            const voltage = safeDivide(value, vDiv);
            this.log(`[ENERGY-ZCL] Voltage: ${voltage}V (raw=${value} div=${vDiv})`);
            this.setCapabilityValue('measure_voltage', parseFloat(voltage)).catch(() => { });
      });
        }

        // Current
        if (zclAttrs.current) {
          const cDiv = this.zclEnergyDivisors.current;
          elecCluster.on('attr.rmsCurrent', (value) => {
            const current = safeDivide(value, cDiv);
            this.log(`[ENERGY-ZCL] Current: ${current}A (raw=${value} div=${cDiv})`);
            this.setCapabilityValue('measure_current', parseFloat(current)).catch(() => { });
      });
        }

        // v5.12.5: configureReporting to request device updates (fixes missing power/current)
        if (zclAttrs.power && elecCluster.configureReporting) {
          await elecCluster.configureReporting({ activePower: { minInterval: 10, maxInterval: 300, minChange: 1 } })
            .catch(e => this.log('[ENERGY] Power reporting:', e.message));
        }
        if (zclAttrs.voltage && elecCluster.configureReporting) {
          await elecCluster.configureReporting({ rmsVoltage: { minInterval: 60, maxInterval: 3600, minChange: 1 } })
            .catch(e => this.log('[ENERGY] Voltage reporting:', e.message));
        }
        if (zclAttrs.current && elecCluster.configureReporting) {
          await elecCluster.configureReporting({ rmsCurrent: { minInterval: 10, maxInterval: 300, minChange: 10 } })
            .catch(e => this.log('[ENERGY] Current reporting:', e.message));
        }

        this.log('[ENERGY]  ZCL Electrical Measurement configured');
      }
    } catch (e) {
      this.log(`[ENERGY]  Electrical cluster error: ${e.message}`);
    }

    // Metering Cluster (0x0702)  event + poll fallback
    try {
      const mc = ep1.clusters?.metering || ep1.clusters?.seMetering;
      const baseEDiv = zclAttrs.energy?.divisor || 100;const parseE = (v) => {
        const raw = typeof v === 'object' ? v[0] || 0 : v;
        const eScale = parseFloat(this.getSetting?.('meter_power_scale')) || 1;return safeDivide(((raw, safeMultiply)(baseEDiv)), eScale);
      };
      if (mc && zclAttrs.energy) {
        if (mc.on) {
          mc.on('attr.currentSummDelivered', (v) => {
            const e = parseE(v);
            this.log(`[ENERGY-ZCL] Energy: ${e}kWh`);
            this.setCapabilityValue('meter_power', parseFloat(e)).catch(() => { });
      });
        }
        // v5.11.26: Poll metering  many TS011F don't auto-report energy
        if (mc.readAttributes) {
          this._meterPoll = this.homey.setInterval(async () => {
            try {
              const a = await mc.readAttributes(['currentSummDelivered']).catch(() => null);
              if (a?.currentSummDelivered !== undefined) {
                const e = parseE(a.currentSummDelivered);
                await this.setCapabilityValue('meter_power', parseFloat(e)).catch(() => { });
              }
            } catch (_) {}
          }); // v5.12.12: increased from 60s to 120s
        }
        // v5.12.5: also try configureReporting for metering
        if (mc.configureReporting) {
          await mc.configureReporting({ currentSummDelivered: { minInterval: 60, maxInterval: 3600, minChange: 1 } })
            .catch(e => this.log('[ENERGY] Metering reporting:', e.message));
        }
        this.log('[ENERGY]  ZCL Metering configured (poll=120s)');
      }
    } catch (e) {
      this.log(`[ENERGY]  Metering cluster error: ${e.message}`);
    }
  }


  async onDeleted() {
    // Clean up timers to prevent memory leaks
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (this._pollInterval) { clearInterval(this._pollInterval); this._pollInterval = null; }
    this.log('Device deleted, cleaning up');
  }
}

module.exports = EnergyMonitorPlugDevice;

