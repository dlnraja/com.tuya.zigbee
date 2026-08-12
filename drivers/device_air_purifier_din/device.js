'use strict';
const { safeMultiply } = require('../../lib/utils/tuyaUtils.js');
const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * DIN Rail Energy Meter — P126: TuyaZigbeeDevice + mainsPowered + correct divisors
 *
 * DP1/DP6: energy raw = kWh*100 → /100
 * DP18: power W | DP19: V*10 → /10 | DP17/DP20: A*1000 → /1000
 */
const ENERGY_DIVISORS = {
  meter_power: 100,
  measure_voltage: 10,
  measure_current: 1000,
  metering_summation: 1000,
};

class DinRailMeterDevice extends TuyaZigbeeDevice {

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('DIN Rail Meter initializing...');

    if (this.hasCapability('measure_battery')) {
      await this.removeCapability('measure_battery').catch(() => {});
    }

    this._powerScale = parseFloat(this.getSetting('power_scale') || '1');
    this._bidirectional = this.getSetting('bidirectional') || false;

    await this._setupElectricalMeasurement(zclNode);
    await this._setupTuyaDP(zclNode);

    this.log('DIN Rail Meter initialized');
  }

  async _setupElectricalMeasurement(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) { return; }

    const emCluster = ep1.clusters?.electricalMeasurement || ep1.clusters?.[2820];
    if (emCluster) {
      this.log('[EM] Electrical Measurement cluster found');

      emCluster.on('attr.activePower', (value) => {
        const power = (Number(value) || 0) * (this._powerScale || 1);
        this.log(`[EM] Power: ${power}W`);
        this.safeSetCapabilityValue('measure_power', power).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      });

      emCluster.on('attr.rmsVoltage', (value) => {
        const voltage = (Number(value) || 0) / ENERGY_DIVISORS.measure_voltage;
        this.log(`[EM] Voltage: ${voltage}V`);
        this.safeSetCapabilityValue('measure_voltage', voltage).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      });

      emCluster.on('attr.rmsCurrent', (value) => {
        const current = (Number(value) || 0) / ENERGY_DIVISORS.measure_current;
        this.log(`[EM] Current: ${current}A`);
        this.safeSetCapabilityValue('measure_current', current).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      });
    }

    const meteringCluster = ep1.clusters?.metering || ep1.clusters?.[1794];
    if (meteringCluster) {
      this.log('[METERING] Metering cluster found');

      meteringCluster.on('attr.currentSummationDelivered', (value) => {
        const energy = (Number(value) || 0) / ENERGY_DIVISORS.metering_summation;
        this.log(`[METERING] Energy: ${energy}kWh`);
        this.safeSetCapabilityValue('meter_power', energy).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      });
    }
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) { return; }

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[CLUSTERS.TUYA_EF00];
    if (!tuyaCluster) { return; }

    this.log('[TUYA] Tuya DP cluster found');

    tuyaCluster.on('response', (response) => this._handleTuyaDP(response));
    tuyaCluster.on('reporting', (report) => this._handleTuyaDP(report));
    tuyaCluster.on('datapoint', (dp, value) => this._handleDP(dp, value));
  }

  _handleTuyaDP(data) {
    if (!data || !data.dp) { return; }
    this._handleDP(data.dp, data.value);
  }

  _handleDP(dp, value) {
    this.log(`[DP${dp}] Value: ${value}`);

    switch (dp) {
    case 1: {
      const energy = (Number(value) || 0) / ENERGY_DIVISORS.meter_power;
      this.safeSetCapabilityValue('meter_power', energy).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      break;
    }
    case 6:
      if (this._bidirectional && this.hasCapability('meter_power.exported')) {
        const exported = (Number(value) || 0) / ENERGY_DIVISORS.meter_power;
        this.safeSetCapabilityValue('meter_power.exported', exported).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      }
      break;
    case 18: {
      const power = safeMultiply(value, this._powerScale);
      this.safeSetCapabilityValue('measure_power', power).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      break;
    }
    case 19: {
      const voltage = (Number(value) || 0) / ENERGY_DIVISORS.measure_voltage;
      this.safeSetCapabilityValue('measure_voltage', voltage).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      break;
    }
    case 20:
    case 17: {
      const current = (Number(value) || 0) / ENERGY_DIVISORS.measure_current;
      this.safeSetCapabilityValue('measure_current', current).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
      break;
    }
    case 101:
      this.log(`[DP101] Power factor: ${value}%`);
      break;
    case 102:
      this.log(`[DP102] Frequency: ${value / 100}Hz`);
      break;
    default:
      break;
    }
  }

  async onSettings({ newSettings, changedKeys }) {
    if (changedKeys.includes('power_scale')) {
      this._powerScale = parseFloat(newSettings.power_scale);
    }
    if (changedKeys.includes('bidirectional')) {
      this._bidirectional = newSettings.bidirectional;
    }
  }

  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = DinRailMeterDevice;
