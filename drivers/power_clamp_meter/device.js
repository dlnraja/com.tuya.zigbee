'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * CT Clamp Power Meter Device
 *
 * Non-invasive current monitoring via CT clamps
 * Supports single-phase and 3-phase configurations
 *
 * Common DP mappings:
 * DP1-6: Energy per phase
 * DP16-18: Power per phase (W)
 * DP19: Voltage (V * 10)
 * DP20-22: Current per phase (A * 1000)
 * DP101: Total power
 * DP102: Total energy
 */
class PowerClampMeterDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('CT Clamp Power Meter initializing...');

    this._ctRatio = this.getSetting('ct_ratio') || 1;

    await this._setupTuyaDP(zclNode);
    await this._setupElectricalMeasurement(zclNode);

    this.log('CT Clamp Power Meter initialized');
  }

  async _setupElectricalMeasurement(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const emCluster = ep1.clusters?.electricalMeasurement || ep1.clusters?.[2820];
    if (emCluster) {
      this.log('[EM] Electrical Measurement cluster available');

      emCluster.on('attr.activePower', (value) => {
        this.setCapabilityValue('measure_power', value / 10).catch(this.error);
      });

      emCluster.on('attr.rmsVoltage', (value) => {
        this.setCapabilityValue('measure_voltage', value / 10).catch(this.error);
      });

      emCluster.on('attr.rmsCurrent', (value) => {
        this.setCapabilityValue('measure_current', (value / 1000) * this._ctRatio).catch(this.error);
      });
    }
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode.endpoints[1];
    if (!ep1) return;

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184];
    if (!tuyaCluster) return;

    this.log('[TUYA] DP cluster found');

    tuyaCluster.on('response', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('reporting', (r) => this._handleDP(r?.dp, r?.value));
    tuyaCluster.on('datapoint', (dp, value) => this._handleDP(dp, value));
  }

  _handleDP(dp, value) {
    if (dp === undefined) return;
    this.log(`[DP${dp}] = ${value}`);

    switch (dp) {
      case 1: // Total energy (kWh * 100)
      case 102:
        this.setCapabilityValue('meter_power', value / 100).catch(this.error);
        break;

      case 16: // Phase 1 power (W)
        if (this.hasCapability('measure_power.phase1')) {
          this.setCapabilityValue('measure_power.phase1', value).catch(this.error);
        }
        this._updateTotalPower();
        break;

      case 17: // Phase 2 power (W)
        if (this.hasCapability('measure_power.phase2')) {
          this.setCapabilityValue('measure_power.phase2', value).catch(this.error);
        }
        this._updateTotalPower();
        break;

      case 18: // Phase 3 power (W)
        if (this.hasCapability('measure_power.phase3')) {
          this.setCapabilityValue('measure_power.phase3', value).catch(this.error);
        }
        this._updateTotalPower();
        break;

      case 19: // Voltage (V * 10)
        this.setCapabilityValue('measure_voltage', value / 10).catch(this.error);
        break;

      case 20: // Current phase 1 (A * 1000)
      case 21: // Current phase 2
      case 22: // Current phase 3
        this.setCapabilityValue('measure_current', (value / 1000) * this._ctRatio).catch(this.error);
        break;

      case 101: // Total power (W)
        this.setCapabilityValue('measure_power', value).catch(this.error);
        break;
    }
  }

  async _updateTotalPower() {
    try {
      const p1 = this.getCapabilityValue('measure_power.phase1') || 0;
      const p2 = this.getCapabilityValue('measure_power.phase2') || 0;
      const p3 = this.getCapabilityValue('measure_power.phase3') || 0;
      await this.setCapabilityValue('measure_power', p1 + p2 + p3);
    } catch (e) {
      this.error('Failed to update total power:', e);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('ct_ratio')) {
      this._ctRatio = newSettings.ct_ratio;
      this.log(`CT ratio changed to: ${this._ctRatio}`);
    }
  }
}

module.exports = PowerClampMeterDevice;
