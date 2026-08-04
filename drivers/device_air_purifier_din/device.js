'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');


const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');


const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

// Energy scaling divisors — ZCL raw attributes / Tuya DP raw values scaled below;
// standard Tuya-DP drivers use smartDivisor: true via SmartDivisorManager
const ENERGY_DIVISORS = {
  meter_power: { divisor: 100 }, // DP1/DP6 raw: kWh * 100
  measure_power: { divisor: 1 }, // DP18 raw: W (pass-through, power_scale setting applied separately)
  measure_voltage: { divisor: 10 }, // DP19 raw: V * 10
  measure_current: { divisor: 1000 }, // DP17/DP20 raw: A * 1000
  metering_summation: { divisor: 1000 } // ZCL seMetering currentSummationDelivered
};

/**
 * DIN Rail Energy Meter Device
 *
 * Supports: Power, Voltage, Current, Energy ((import / export))
 * Clusters: Tuya DP (CLUSTERS.TUYA_EF00), Electrical Measurement (0x0B04), Metering (0x0702)
 *
 * Common DP mappings:
 * DP1: Total energy (kWh * 100)
 * DP6: Total energy (reverse / export)
 * DP16: State ((on / off) for some models)
 * DP17: Total current (A * 1000)
 * DP18: Power (W)
 * DP19: Voltage (V * 10)
 * DP20: Current (A * 1000)
 * DP101: Power factor
 * DP102: Frequency
 */
class DinRailMeterDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('DIN Rail Meter initializing...');

    // Settings
    this._powerScale = parseFloat(this.getSetting('power_scale') || '1');
    this._bidirectional = this.getSetting('bidirectional') || false;

    // Try standard ZCL electrical measurement cluster
    await this._setupElectricalMeasurement(zclNode);

    // Try Tuya DP cluster for TS0601 devices
    await this._setupTuyaDP(zclNode);

    this.log('DIN Rail Meter initialized');
  }

  async _setupElectricalMeasurement(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const emCluster = ep1.clusters?.electricalMeasurement || ep1.clusters?.[2820];
    if (emCluster) {
      this.log('[EM] Electrical Measurement cluster found' );

      emCluster.on('attr.activePower', (value) => {
        const power =((value * safeParse)(this._powerScale) * 10);
        this.log(`[EM] Power: ${power}W`);
        this.safeSetCapabilityValue('measure_power', power).catch(this.error);
      });

      emCluster.on('attr.rmsVoltage', (value) => {
        const voltage = safeMultiply(value, ENERGY_DIVISORS.measure_voltage.divisor);
        this.log(`[EM] Voltage: ${voltage}V`);
        this.safeSetCapabilityValue('measure_voltage', voltage).catch(this.error);
      });

      emCluster.on('attr.rmsCurrent', (value) => {
        const current = value * ENERGY_DIVISORS.measure_current.divisor;
        this.log(`[EM] Current: ${current}A`);
        this.safeSetCapabilityValue('measure_current', current).catch(this.error);
      });
    }

    const meteringCluster = ep1.clusters?.metering || ep1.clusters?.[1794];
    if (meteringCluster) {
      this.log('[METERING] Metering cluster found' );

      meteringCluster.on('attr.currentSummationDelivered', (value) => {
        const energy = value * ENERGY_DIVISORS.metering_summation.divisor;
        this.log(`[METERING] Energy: ${energy}kWh`);
        this.safeSetCapabilityValue('meter_power', energy).catch(this.error);
      });
    }
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[CLUSTERS.TUYA_EF00];
    if (!tuyaCluster) return;

    this.log('[TUYA] Tuya DP cluster found');

    tuyaCluster.on('response', (response) => {
      this._handleTuyaDP(response);
      });

    tuyaCluster.on('reporting', (report) => {
      this._handleTuyaDP(report);
      });

    tuyaCluster.on('datapoint', (dp, value) => {
      this._handleDP(dp, value);
      });
  }

  _handleTuyaDP(data) {
    if (!data || !data.dp) return;
    this._handleDP(data.dp, data.value );
  }

  _handleDP(dp, value) {
    this.log(`[DP${dp}] Value: ${value}`);

    switch (dp) {
    case 1: //Total energy consumed (kWh*100)
      const energy = value * ENERGY_DIVISORS.meter_power.divisor;
      this.log(`[DP1] Energy consumed: ${energy}kWh`);
      this.safeSetCapabilityValue('meter_power', energy).catch(this.error);
      break;

    case 6: //Total energy exported (kWh*100) - for bidirectional meters
      if (this._bidirectional && this.hasCapability('meter_power.exported')) {
        const exported = value * ENERGY_DIVISORS.meter_power.divisor;
        this.log(`[DP6] Energy exported: ${exported}kWh`);
        this.safeSetCapabilityValue('meter_power.exported', exported).catch(this.error);
      }
      break;

    case 18: // Power (W)
      const power =safeMultiply(value, this)._powerScale;
      this.log(`[DP18] Power: ${power}W`);
      this.safeSetCapabilityValue('measure_power', power).catch(this.error);
      break;

    case 19: //Voltage (V*10)
      const voltage = safeMultiply(value, ENERGY_DIVISORS.measure_voltage.divisor);
      this.log(`[DP19] Voltage: ${voltage}V`);
      this.safeSetCapabilityValue('measure_voltage', voltage).catch(this.error);
      break;

    case 20: //Current (A*1000)
      const current = value * ENERGY_DIVISORS.measure_current.divisor;
      this.log(`[DP20] Current: ${current}A`);
      this.safeSetCapabilityValue('measure_current', current).catch(this.error);
      break;

    case 17: // Total current for some models
      const totalCurrent = value * ENERGY_DIVISORS.measure_current.divisor;
      this.log(`[DP17] Total current: ${totalCurrent}A`);
      this.safeSetCapabilityValue('measure_current', totalCurrent).catch(this.error);
      break;

    case 101: // Power factor (some models)
      this.log(`[DP101] Power factor: ${value}%`);
      break;

    case 102: // Frequency (some models)
      this.log(`[DP102] Frequency: ${value/100}Hz`);
      break;
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('power_scale')) {
      this._powerScale = parseFloat(newSettings.power_scale);
      this.log(`Power scale changed to: ${this._powerScale}`);
    }
    if (changedKeys.includes('bidirectional')) {
      this._bidirectional = newSettings.bidirectional;
      this.log(`Bidirectional mode: ${this._bidirectional}`);
    }
  }


  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = DinRailMeterDevice;

