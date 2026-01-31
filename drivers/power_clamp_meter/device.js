'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * CT Clamp Power Meter Device
 * v5.7.5: FIXED DP mappings for PJ-1203A per Z2M #18419 (blutch32 forum #1011)
 *
 * Non-invasive current monitoring via CT clamps
 * Supports single-phase, 2-channel (A/B), and 3-phase configurations
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PJ-1203A 2-CHANNEL DP MAPPINGS (CORRECTED from Z2M #18419):
 * ═══════════════════════════════════════════════════════════════════════════
 * DP101: power_a (W ÷10)
 * DP102: power_direction_a (0=forward, 1=reverse)
 * DP104: power_direction_b
 * DP105: power_b (W ÷10)
 * DP106: energy_forward_a (kWh ÷100)
 * DP107: energy_reverse_a (kWh ÷100)
 * DP108: energy_forward_b (kWh ÷100)
 * DP109: energy_reverse_b (kWh ÷100)
 * DP110: power_factor_a (÷100)
 * DP111: ac_frequency (Hz ÷100)
 * DP112: voltage (V ÷10)
 * DP113: current_a (A ÷1000)
 * DP114: current_b (A ÷1000)
 * DP115: power_ab (W ÷10) - Total power
 * DP121: power_factor_b (÷100)
 * DP129: update_frequency (seconds)
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

  /**
   * v5.7.6: Detect meter profile based on manufacturerName
   * PJ-1203A variants: _TZE284_81yrt3lo, _TZE204_81yrt3lo, _TZE204_cjbofhxw (Matsee Plus)
   * 3-phase: _TZE200_nslr42tt, _TZE204_nslr42tt
   * Source: Z2M #18419, #15359, ZHA #3152, #3658
   */
  get meterProfile() {
    const mfr = this.getSetting('zb_manufacturer_name') || this.getStoreValue('manufacturerName') || '';
    // PJ-1203A 2-channel bidirectional variants (from Z2M research)
    const pj1203aIds = [
      '_TZE284_81yrt3lo', '_TZE204_81yrt3lo',  // Original PJ-1203A
      '_TZE204_cjbofhxw', '_TZE284_cjbofhxw'   // Matsee Plus variant (Z2M #15359)
    ];
    return pj1203aIds.some(id => mfr.toLowerCase().includes(id.toLowerCase())) ? 'pj1203a' : '3phase';
  }

  _handleDP(dp, value) {
    // v5.7.7: Guard against undefined/null values (fixes crash from diagnostic report)
    if (dp === undefined || dp === null) return;
    if (value === undefined || value === null) {
      this.log(`[DP${dp}] = undefined (skipped)`);
      return;
    }
    const profile = this.meterProfile;
    this.log(`[DP${dp}] = ${value} (profile: ${profile})`);

    // ═══════════════════════════════════════════════════════════════════
    // v5.7.5: PJ-1203A 2-CHANNEL BIDIRECTIONAL (FIXED per Z2M #18419)
    // ═══════════════════════════════════════════════════════════════════
    if (profile === 'pj1203a') {
      switch (dp) {
        case 101: // Power A (W ÷10)
          const powerA = value / 10;
          if (this.hasCapability('measure_power.phase1')) {
            this.setCapabilityValue('measure_power.phase1', powerA).catch(this.error);
          }
          this._powerA = powerA;
          this.log(`[PJ1203A] ⚡ Power A: ${powerA} W`);
          this._updateTotalPowerPJ1203A();
          break;

        case 102: // Power direction A (0=forward/consuming, 1=reverse/producing)
          this._directionA = value;
          this.log(`[PJ1203A] 🔄 Direction A: ${value === 0 ? 'consuming' : 'producing'}`);
          break;

        case 104: // Power direction B
          this._directionB = value;
          this.log(`[PJ1203A] 🔄 Direction B: ${value === 0 ? 'consuming' : 'producing'}`);
          break;

        case 105: // Power B (W ÷10)
          const powerB = value / 10;
          if (this.hasCapability('measure_power.phase2')) {
            this.setCapabilityValue('measure_power.phase2', powerB).catch(this.error);
          }
          this._powerB = powerB;
          this.log(`[PJ1203A] ⚡ Power B: ${powerB} W`);
          this._updateTotalPowerPJ1203A();
          break;

        case 106: // Energy forward A (kWh ÷100)
          this._energyForwardA = value / 100;
          this.log(`[PJ1203A] 📊 Energy Forward A: ${this._energyForwardA} kWh`);
          this._updateTotalEnergy();
          break;

        case 107: // Energy reverse A (kWh ÷100) - produced/exported
          this._energyReverseA = value / 100;
          this.log(`[PJ1203A] 🔋 Energy Reverse A: ${this._energyReverseA} kWh`);
          break;

        case 108: // Energy forward B (kWh ÷100)
          this._energyForwardB = value / 100;
          this.log(`[PJ1203A] 📊 Energy Forward B: ${this._energyForwardB} kWh`);
          this._updateTotalEnergy();
          break;

        case 109: // Energy reverse B (kWh ÷100) - produced/exported
          this._energyReverseB = value / 100;
          this.log(`[PJ1203A] 🔋 Energy Reverse B: ${this._energyReverseB} kWh`);
          break;

        case 110: // Power factor A (÷100)
          this.log(`[PJ1203A] 📈 Power Factor A: ${value / 100}`);
          break;

        case 111: // AC frequency (Hz ÷100)
          this.log(`[PJ1203A] ⚡ AC Frequency: ${value / 100} Hz`);
          break;

        case 112: // Voltage (V ÷10)
          this.setCapabilityValue('measure_voltage', value / 10).catch(this.error);
          this.log(`[PJ1203A] ⚡ Voltage: ${value / 10} V`);
          break;

        case 113: // Current A (A ÷1000)
          this.setCapabilityValue('measure_current', (value / 1000) * this._ctRatio).catch(this.error);
          this.log(`[PJ1203A] ⚡ Current A: ${value / 1000} A`);
          break;

        case 114: // Current B (A ÷1000)
          this.log(`[PJ1203A] ⚡ Current B: ${value / 1000} A`);
          break;

        case 115: // Power AB Total (W ÷10)
          const totalPower = value / 10;
          this.setCapabilityValue('measure_power', totalPower).catch(this.error);
          this.log(`[PJ1203A] ⚡ Total Power: ${totalPower} W`);
          break;

        case 121: // Power factor B (÷100)
          this.log(`[PJ1203A] 📈 Power Factor B: ${value / 100}`);
          break;

        case 129: // Update frequency (seconds)
          this.log(`[PJ1203A] ⏱️ Update Frequency: ${value} s`);
          break;
      }
      return; // Exit after PJ-1203A handling
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3-PHASE METERS (original logic)
    // ═══════════════════════════════════════════════════════════════════
    switch (dp) {
      case 1: // Total energy (kWh * 100)
        this.setCapabilityValue('meter_power', value / 100).catch(this.error);
        break;

      case 16: // Phase 1 power (W)
        if (this.hasCapability('measure_power.phase1')) {
          this.setCapabilityValue('measure_power.phase1', value).catch(this.error);
          this._updateTotalPower();
        }
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

      case 102: // Total energy (kWh * 100)
        this.setCapabilityValue('meter_power', value / 100).catch(this.error);
        break;
    }
  }

  /**
   * v5.7.5: Update total power for PJ-1203A (2-channel only)
   */
  _updateTotalPowerPJ1203A() {
    const powerA = this._powerA || 0;
    const powerB = this._powerB || 0;
    const total = powerA + powerB;
    this.setCapabilityValue('measure_power', total).catch(this.error);
  }

  /**
   * v5.7.5: Update total energy from channel A + B (PJ-1203A uses forward energy)
   */
  _updateTotalEnergy() {
    const energyA = this._energyForwardA || this._energyA || 0;
    const energyB = this._energyForwardB || this._energyB || 0;
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
