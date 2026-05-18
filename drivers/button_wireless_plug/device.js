'use strict';

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin.js');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const { setupSonoffEnergy } = require('../../lib/mixins/SonoffEnergyMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      ENERGY MONITOR PLUG - v5.5.255 INTELLIGENT ENERGY MANAGEMENT           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  - Auto-detects energy meter type per manufacturerName                       ║
 * ║  - Supports ZCL (TS011F) and Tuya DP (TS0601) protocols                     ║
 * ║  - Dynamic divisors for power/voltage/current/energy                         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const ENERGY_DEVICE_CONFIGS = {
  'TUYA_DP_STANDARD': {
    sensors: ['_TZE200_byzdayie', '_TZE200_fsb6zw01', '_TZE200_ewxhg6o9', '_TZE204_byzdayie', '_TZE204_fsb6zw01'],
    protocol: 'tuya',
    dpMap: {
      1: { cap: 'onoff', type: 'bool' },
      17: { cap: 'measure_current', divisor: 1000 },
      18: { cap: 'measure_power', divisor: 10 },
      19: { cap: 'measure_voltage', divisor: 10 },
      20: { cap: 'meter_power', divisor: 100 },
    }
  },
  'TUYA_DP_ALT': {
    sensors: ['_TZE200_bkkmqmyo', '_TZE200_eaac7dkw', '_TZE204_bkkmqmyo', '_TZE200_lsanae15', '_TZE204_lsanae15', '_TZE200_tz32mtza'],
    protocol: 'tuya',
    dpMap: {
      1: { cap: 'onoff', type: 'bool' },
      9: { cap: 'meter_power', divisor: 100 },
      16: { cap: 'onoff', type: 'bool' },
      17: { cap: 'meter_power', divisor: 100 },
      18: { cap: 'measure_power', divisor: 10 },
      19: { cap: 'measure_current', divisor: 1000 },
      20: { cap: 'measure_voltage', divisor: 10 },
    }
  },
  'ZCL_ELECTRICAL': {
    sensors: [
      '_TZ3000_cphmq0q7', '_TZ3000_dpo1ysak', '_TZ3000_ew3ldmgx', '_TZ3000_gjnozsaz', '_TZ3000_gvn91tmx',
      '_TZ3000_hkuahi4e', '_TZ3000_iv6ph5tr', '_TZ3000_jvovfwyk', '_TZ3000_kdi2o9m6', '_TZ3000_mlswgkc3',
      '_TZ3000_okaz9tjs', '_TZ3000_ps3dmato', '_TZ3000_qeuvnohg', '_TZ3000_rdtixbnu', '_TZ3000_typdpbpg',
      '_TZ3000_upjrsxh1', '_TZ3000_w0qqde0g', '_TZ3210_w0qqde0g', '_TZ3000_waho4ber', '_TZ3000_zloso4jk',
      '_TZ3000_5f43h46b', '_TZ3000_cehuw1lw', '_TZ3000_g5xawfcq', '_TZ3000_hdopuwv6', '_TZ3000_mraovvmm',
      '_TZ3000_ss98ec5d', '_TZ3000_uwkja6z1', '_TZ3000_yujkchbz', '_TZ3210_xzhnra8x', 'SONOFF', 'Sonoff'
    ],
    protocol: 'zcl',
    zclAttrs: {
      power: { cluster: 0x0B04, attr: 'activePower', divisor: 10 },
      voltage: { cluster: 0x0B04, attr: 'rmsVoltage', divisor: 10 },
      current: { cluster: 0x0B04, attr: 'rmsCurrent', divisor: 1000 },
      energy: { cluster: 0x0702, attr: 'currentSummDelivered', divisor: 100 },
    }
  },
  'ZCL_SILVERCREST': {
    sensors: ['_TZ3000_1obwwnmq', '_TZ3000_vtscrpmw', '_TZ3000_ksw8qtmt', '_TZ3000_u5u4cakc'],
    protocol: 'zcl',
    zclAttrs: {
      power: { cluster: 0x0B04, attr: 'activePower', divisor: 1 },
      voltage: { cluster: 0x0B04, attr: 'rmsVoltage', divisor: 10 },
      current: { cluster: 0x0B04, attr: 'rmsCurrent', divisor: 1000 },
    }
  },
  'TUYA_BLITZWOLF': {
    sensors: ['_TZE200_nkjintbl', '_TZE200_wfxuhoea', '_TZE204_nkjintbl'],
    protocol: 'tuya',
    dpMap: {
      1: { cap: 'onoff', type: 'bool' },
      9: { cap: 'meter_power', divisor: 100 },
      17: { cap: 'measure_voltage', divisor: 10 },
      18: { cap: 'measure_current', divisor: 1000 },
      19: { cap: 'measure_power', divisor: 10 },
    }
  },
  'TUYA_3PHASE': {
    sensors: ['_TZE200_nphsqjnz', '_TZE204_nphsqjnz', '_TZE200_v9hkz2up'],
    protocol: 'tuya',
    dpMap: {
      1: { cap: 'onoff', type: 'bool' },
      6: { cap: null, internal: 'report_interval' },
      101: { cap: 'measure_power', divisor: 10 },
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

class EnergyMonitorPlugDevice extends VirtualButtonMixin(PhysicalButtonMixin(UnifiedPlugBase)) {

  get mainsPowered() { return true; }

  get zclEnergyDivisors() {
    const mfr = this.getSetting('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
    const directUnitMfrs = ['_TZ3210_xzhnra8x', '_TZ3210_w0qqde0g'];
    const baseDivisors = directUnitMfrs.includes(mfr) 
      ? { power: 1, voltage: 1, current: 1000 }
      : super.zclEnergyDivisors;
      
    const powerScale = parseFloat(this.getSetting('power_scale')) || 1;
    const voltageScale = parseFloat(this.getSetting('voltage_scale')) || 1;
    const currentScale = parseFloat(this.getSetting('current_scale')) || 1;
    
    return {
      power: baseDivisors.power / powerScale,
      voltage: baseDivisors.voltage / voltageScale,
      current: baseDivisors.current / currentScale
    };
  }

  _getEnergyConfig() {
    if (!this._energyConfig) {
      const mfr = this.getSetting('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
      this._energyConfig = Object.values(ENERGY_DEVICE_CONFIGS).find(c => c.sensors.includes(mfr)) || ENERGY_DEVICE_CONFIGS.TUYA_DP_STANDARD;
    }
    return this._energyConfig;
  }

  get plugCapabilities() {
    const config = this._getEnergyConfig();
    const caps = ['onoff'];

    if (config.dpMap) {
      for (const dp of Object.values(config.dpMap)) {
        if (dp.cap && !caps.includes(dp.cap) && !dp.cap.includes('.')) {
          caps.push(dp.cap);
        }
      }
    }

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

    const energyCaps = ['measure_power', 'meter_power', 'measure_voltage', 'measure_current'];
    for (const cap of energyCaps) {
      if (!caps.includes(cap)) caps.push(cap);
    }

    return caps;
  }

  get dpMappings() {
    const config = this._getEnergyConfig();
    if (config.protocol === 'zcl') return { 1: { capability: 'onoff', transform: (v) => v === 1 || v === true } };

    const mappings = {};
    const dpMap = config.dpMap || {};
    for (const [dpId, dpConfig] of Object.entries(dpMap)) {
      const dp = parseInt(dpId);
      if (dpConfig.type === 'bool') {
        mappings[dp] = { capability: dpConfig.cap, transform: (v) => v === 1 || v === true };
      } else if (dpConfig.cap) {
        mappings[dp] = { capability: dpConfig.cap, divisor: dpConfig.divisor || 1 };
      } else if (dpConfig.internal) {
        mappings[dp] = { capability: null, internal: dpConfig.internal };
      }
    }
    return mappings;
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      await super.onNodeInit({ zclNode });
      await this.initVirtualButtons();

      // --- Attribute Reporting Configuration ---
      try {
        await this.configureAttributeReporting([
          { cluster: 'haElectricalMeasurement', attributeName: 'activePower', minInterval: 10, maxInterval: 300, minChange: 5 },
          { cluster: 'haElectricalMeasurement', attributeName: 'rmsVoltage', minInterval: 30, maxInterval: 600, minChange: 1 },
          { cluster: 'haElectricalMeasurement', attributeName: 'rmsCurrent', minInterval: 30, maxInterval: 600, minChange: 10 }
        ]);
        this.log('Attribute reporting configured successfully');
      } catch (err) {
        this.log('Attribute reporting config failed:', err.message);
      }

      const mfr = this.getSetting('zb_manufacturer_name') || this.getData()?.manufacturerName || '';
      const config = this._getEnergyConfig();
      this.log(`[ENERGY] Manufacturer: ${mfr}, Protocol: ${config.protocol}`);

      if (config.protocol === 'zcl') {
        await this._setupZclEnergy(zclNode, config);
      }
      
      await setupSonoffEnergy(this, zclNode);
      await this.initPhysicalButtonDetection(zclNode);
      this.log('[ENERGY] ✅ Energy monitor plug ready');
    }, 'onNodeInit');
  }

  async _setupZclEnergy(zclNode, config) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    const zclAttrs = config.zclAttrs || {};
    const elecCluster = ep1.clusters?.electricalMeasurement;
    if (elecCluster) {
      if (zclAttrs.power) {
        const pDiv = this.zclEnergyDivisors.power;
        elecCluster.on('attr.activePower', (value) => {
          this.setCapabilityValue('measure_power', parseFloat(Math.max(0, value / pDiv))).catch(() => { });
        });
      }
      if (zclAttrs.voltage) {
        const vDiv = this.zclEnergyDivisors.voltage;
        elecCluster.on('attr.rmsVoltage', (value) => {
          this.setCapabilityValue('measure_voltage', parseFloat(value / vDiv)).catch(() => { });
        });
      }
      if (zclAttrs.current) {
        const cDiv = this.zclEnergyDivisors.current;
        elecCluster.on('attr.rmsCurrent', (value) => {
          this.setCapabilityValue('measure_current', parseFloat(value / cDiv)).catch(() => { });
        });
      }
    }

    const mc = ep1.clusters?.metering || ep1.clusters?.seMetering;
    if (mc && zclAttrs.energy) {
      const baseEDiv = zclAttrs.energy.divisor || 100;
      const parseE = (v) => {
        const raw = typeof v === 'object' ? v[0] || 0 : v;
        const eScale = parseFloat(this.getSetting('meter_power_scale')) || 1;
        return (raw / baseEDiv) * eScale;
      };
      mc.on('attr.currentSummDelivered', (v) => {
        this.setCapabilityValue('meter_power', parseFloat(parseE(v))).catch(() => { });
      });
      
      // Poll fallback
      this._pollMetering(mc, parseE);
    }
  }

  _pollMetering(mc, parseE) {
    if (!mc.readAttributes) return;
    this._meterPoll = this.homey.setInterval(async () => {
      try {
        const a = await mc.readAttributes(['currentSummDelivered']).catch(() => null);
        if (a?.currentSummDelivered !== undefined) {
          this.setCapabilityValue('meter_power', parseFloat(parseE(a.currentSummDelivered))).catch(() => { });
        }
      } catch (_) { }
    }, 120000);
  }

  onDeleted() {
    if (this._meterPoll) {
      this.homey.clearInterval(this._meterPoll);
      this._meterPoll = null;
    }
    if (super.onDeleted) super.onDeleted();
  }
}

module.exports = EnergyMonitorPlugDevice;
