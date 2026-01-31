'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * CT Clamp Power Meter Device
 * v5.5.995: Enhanced for PJ-1203A 2-channel bidirectional meter (blutch32 forum #1011)
 *
 * Non-invasive current monitoring via CT clamps
 * Supports single-phase, 2-channel (A/B), and 3-phase configurations
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PJ-1203A 2-CHANNEL DP MAPPINGS (from Z2M tuya.ts):
 * ═══════════════════════════════════════════════════════════════════════════
 * DP6:   ac_frequency (Hz * 100)
 * DP9:   energy_flow_a (0=consuming, 1=producing, 2=sign)
 * DP10:  energy_flow_b
 * DP16:  voltage (V * 10)
 * DP101: power_a (W, channel A)
 * DP102: power_b (W, channel B)
 * DP105: power_ab (W, total A+B)
 * DP111: energy_a (kWh * 100, channel A consumed)
 * DP112: energy_b (kWh * 100, channel B consumed)
 * DP115: energy_produced_a (kWh * 100, channel A produced)
 * DP116: energy_produced_b (kWh * 100, channel B produced)
 * DP121: current_a (A * 1000)
 * DP122: current_b (A * 1000)
 * DP131: power_factor_a (%)
 * DP132: power_factor_b (%)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 3-PHASE DP MAPPINGS:
 * ═══════════════════════════════════════════════════════════════════════════
 * DP1-6:   Energy per phase
 * DP16-18: Power per phase (W)
 * DP19:    Voltage (V * 10)
 * DP20-22: Current per phase (A * 1000)
 * DP101:   Total power
 * DP102:   Total energy
 *
 * Supported models:
 * - _TZE284_81yrt3lo / _TZE204_81yrt3lo - PJ-1203A 2-channel bidirectional
 * - _TZE200_nslr42tt / _TZE204_nslr42tt - 3-phase meter
 * ═══════════════════════════════════════════════════════════════════════════
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
      // ═══════════════════════════════════════════════════════════════════
      // ENERGY (kWh) - Multiple sources depending on meter type
      // ═══════════════════════════════════════════════════════════════════
      case 1: // Total energy (kWh * 100) - 3-phase meters
        this.setCapabilityValue('meter_power', value / 100).catch(this.error);
        break;

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.995: PJ-1203A 2-CHANNEL BIDIRECTIONAL METER (blutch32)
      // ═══════════════════════════════════════════════════════════════════
      case 6: // AC frequency (Hz * 100)
        this.log(`[METER] ⚡ AC Frequency: ${value / 100} Hz`);
        break;

      case 9: // Energy flow A (0=consuming, 1=producing, 2=sign)
        this._energyFlowA = value;
        this.log(`[METER] 🔄 Energy Flow A: ${['consuming', 'producing', 'sign'][value] || value}`);
        break;

      case 10: // Energy flow B
        this._energyFlowB = value;
        this.log(`[METER] 🔄 Energy Flow B: ${['consuming', 'producing', 'sign'][value] || value}`);
        break;

      case 16: // Voltage (V * 10) - PJ-1203A OR Phase 1 power for 3-phase
        // v5.5.995: Detect if this is voltage or power based on value range
        if (value > 1000 && value < 3000) {
          // Likely voltage (100-300V range when * 10)
          this.setCapabilityValue('measure_voltage', value / 10).catch(this.error);
        } else if (this.hasCapability('measure_power.phase1')) {
          // 3-phase meter: Phase 1 power
          this.setCapabilityValue('measure_power.phase1', value).catch(this.error);
          this._updateTotalPower();
        }
        break;

      case 17: // Phase 2 power (W) - 3-phase meters
        if (this.hasCapability('measure_power.phase2')) {
          this.setCapabilityValue('measure_power.phase2', value).catch(this.error);
        }
        this._updateTotalPower();
        break;

      case 18: // Phase 3 power (W) - 3-phase meters
        if (this.hasCapability('measure_power.phase3')) {
          this.setCapabilityValue('measure_power.phase3', value).catch(this.error);
        }
        this._updateTotalPower();
        break;

      case 19: // Voltage (V * 10) - 3-phase meters
        this.setCapabilityValue('measure_voltage', value / 10).catch(this.error);
        break;

      case 20: // Current phase 1 (A * 1000)
      case 21: // Current phase 2
      case 22: // Current phase 3
        this.setCapabilityValue('measure_current', (value / 1000) * this._ctRatio).catch(this.error);
        break;

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.995: PJ-1203A POWER (W) - Channel A/B
      // ═══════════════════════════════════════════════════════════════════
      case 101: // Power A (W) - Channel A
        if (this.hasCapability('measure_power.phase1')) {
          this.setCapabilityValue('measure_power.phase1', value).catch(this.error);
        }
        this.log(`[METER] ⚡ Power A: ${value} W`);
        this._updateTotalPower();
        break;

      case 102: // Power B (W) - Channel B OR Total energy for 3-phase
        if (this.hasCapability('measure_power.phase2')) {
          this.setCapabilityValue('measure_power.phase2', value).catch(this.error);
          this.log(`[METER] ⚡ Power B: ${value} W`);
          this._updateTotalPower();
        } else {
          // 3-phase meter: Total energy
          this.setCapabilityValue('meter_power', value / 100).catch(this.error);
        }
        break;

      case 105: // Power AB (W) - Total power for 2-channel
        this.setCapabilityValue('measure_power', value).catch(this.error);
        this.log(`[METER] ⚡ Total Power: ${value} W`);
        break;

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.995: PJ-1203A ENERGY (kWh) - Channel A/B
      // ═══════════════════════════════════════════════════════════════════
      case 111: // Energy A consumed (kWh * 100)
        this._energyA = value / 100;
        this.log(`[METER] 📊 Energy A: ${this._energyA} kWh`);
        this._updateTotalEnergy();
        break;

      case 112: // Energy B consumed (kWh * 100)
        this._energyB = value / 100;
        this.log(`[METER] 📊 Energy B: ${this._energyB} kWh`);
        this._updateTotalEnergy();
        break;

      case 115: // Energy produced A (kWh * 100)
        this._energyProducedA = value / 100;
        this.log(`[METER] 🔋 Energy Produced A: ${this._energyProducedA} kWh`);
        break;

      case 116: // Energy produced B (kWh * 100)
        this._energyProducedB = value / 100;
        this.log(`[METER] 🔋 Energy Produced B: ${this._energyProducedB} kWh`);
        break;

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.995: PJ-1203A CURRENT (A) - Channel A/B
      // ═══════════════════════════════════════════════════════════════════
      case 121: // Current A (A * 1000)
        this.setCapabilityValue('measure_current', (value / 1000) * this._ctRatio).catch(this.error);
        this.log(`[METER] ⚡ Current A: ${value / 1000} A`);
        break;

      case 122: // Current B (A * 1000)
        this.log(`[METER] ⚡ Current B: ${value / 1000} A`);
        break;

      case 131: // Power factor A (%)
        this.log(`[METER] 📈 Power Factor A: ${value}%`);
        break;

      case 132: // Power factor B (%)
        this.log(`[METER] 📈 Power Factor B: ${value}%`);
        break;
    }
  }

  /**
   * v5.5.995: Update total energy from channel A + B
   */
  _updateTotalEnergy() {
    const energyA = this._energyA || 0;
    const energyB = this._energyB || 0;
    const total = energyA + energyB;
    this.setCapabilityValue('meter_power', total).catch(this.error);
    this.log(`[METER] 📊 Total Energy: ${total} kWh (A:${energyA} + B:${energyB})`);
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
