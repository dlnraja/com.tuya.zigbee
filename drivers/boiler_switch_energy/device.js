'use strict';

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * BoilerSwitchEnergyDevice - Boiler Switch with Energy Monitoring
 * DPs: 1=onoff(BOOL), 6=current(smartDivisor), 7=power(smartDivisor),
 *      8=voltage(smartDivisor), 9=metering(smartDivisor),
 *      12=temperature(smartDivisor), 14=fault(BITMAP)
 */
class BoilerSwitchEnergyDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedPlugBase)) {

  get mainsPowered() { return true; }

  get gangCount() { return 1; }

  get dpMappings() {
    return {
      ...super.dpMappings,
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      6: { capability: 'measure_current', smartDivisor: true },
      7: { capability: 'measure_power', smartDivisor: true },
      8: { capability: 'measure_voltage', smartDivisor: true },
      9: { capability: 'meter_power', smartDivisor: true },
      12: { capability: 'measure_temperature', smartDivisor: true },
      14: { internal: true, type: 'fault', transform: (v) => v !== 0 },
    };
  }

  _getBoilerTrigger(id) {
    try {
      return this.homey?.flow?.getDeviceTriggerCard(id) || null;
    } catch (err) {
      this.log(`[BoilerSwitchEnergy] Flow trigger ${id} unavailable: ${err.message}`);
      return null;
    }
  }

  _triggerBoilerOnOff(state) {
    const nextState = Boolean(state);
    if (this._lastBoilerOnOff === nextState) {return;}
    this._lastBoilerOnOff = nextState;

    const cardId = nextState
      ? 'boiler_switch_energy_turned_on'
      : 'boiler_switch_energy_turned_off';
    const trigger = this._boilerTriggers?.[cardId] || this._getBoilerTrigger(cardId);
    if (!trigger) {return;}

    const tokens = {
      power: Number(this.getCapabilityValue('measure_power') || 0),
      temperature: Number(this.getCapabilityValue('measure_temperature') || 0),
    };
    trigger.trigger(this, tokens, {}).catch(err => {
      this.log(`[BoilerSwitchEnergy] Flow trigger ${cardId} failed: ${err.message}`);
    });
  }

  _parseBoilerOnOff(rawValue) {
    if (Buffer.isBuffer(rawValue)) {
      return rawValue.length > 0 && rawValue[0] === 1;
    }
    return rawValue === 1 || rawValue === true;
  }

  _handleDP(dpId, rawValue) {
    const result = super._handleDP(dpId, rawValue);
    if (Number(dpId) === 1) {
      this._triggerBoilerOnOff(this._parseBoilerOnOff(rawValue));
    }
    return result;
  }

  async onNodeInit({ zclNode }) {
    if (this._initialized || this._initializing) return;
    this._initializing = true;

    try {
      await super.onNodeInit({ zclNode });
      this._boilerTriggers = {
        boiler_switch_energy_turned_on: this._getBoilerTrigger('boiler_switch_energy_turned_on'),
        boiler_switch_energy_turned_off: this._getBoilerTrigger('boiler_switch_energy_turned_off'),
      };
      this._lastBoilerOnOff = Boolean(this.getCapabilityValue('onoff'));
      await this.removeCapability('measure_battery').catch(() => {});
      await this.removeCapability('alarm_battery').catch(() => {});
      await this.initPhysicalButtonDetection?.(zclNode);
      await this.initVirtualButtons?.();
      this._initialized = true;
      this.log('[BoilerSwitchEnergy] Initialized with mains-safe energy and button handling');
    } finally {
      this._initializing = false;
    }
  }

  onDeleted() {
    this._destroyed = true;
    if (super.onDeleted) super.onDeleted();
  }
}

module.exports = BoilerSwitchEnergyDevice;
