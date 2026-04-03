'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
class WiFiHeaterDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1': { capability: 'onoff', writable: true, transform: (v) => v === true || v === 1, reverseTransform: (v) => v === true },
      '2': { capability: 'target_temperature', writable: true, divisor: 1 },
      '3': { capability: 'measure_temperature', divisor: 1 },
      '4': { capability: 'wifi_heater_mode', writable: true, transform: (v) => ({ 0: 'manual', 1: 'program', 2: 'eco' }[v] || 'manual'), reverseTransform: (v) => ({ manual: 0, program: 1, eco: 2 }[v] || 0) },
      '6': { capability: 'child_lock', writable: true, transform: (v) => v === true || v === 1, reverseTransform: (v) => v === true },
      '101': { capability: 'eco_mode', writable: true, transform: (v) => v === true || v === 1, reverseTransform: (v) => v === true },
    };
  }
  async onInit() {
    await super.onInit();
    this._setupFlows();
    this.log('[WIFI-HEATER] Ready');
  }
  _setupFlows() {
    const cf = this.homey.flow;
    cf.getDeviceConditionCard('wifi_heater_is_heating').registerRunListener(async () => this.getCapabilityValue('onoff') === true);
    cf.getDeviceConditionCard('wifi_heater_mode_is').registerRunListener(async (a) => this.getCapabilityValue('wifi_heater_mode') === a.mode);
    cf.getActionCard('wifi_heater_set_mode').registerRunListener(async (a) => { await this._client.setDP('4', ({ manual: 0, program: 1, eco: 2 })[a.mode] || 0); });
    cf.getActionCard('wifi_heater_set_temperature').registerRunListener(async (a) => { await this._client.setDP('2', Math.round(a.temperature)); });
  }
  _fireFlowTriggers(changes) {
    const cf = this.homey.flow;
    if (changes.onoff) {
      const cardId = changes.onoff.to ? 'wifi_heater_turned_on' : 'wifi_heater_turned_off';
      cf.getDeviceTriggerCard(cardId).trigger(this, {}, {}).catch(this.error);
    }
    if (changes.wifi_heater_mode) {
      cf.getDeviceTriggerCard('wifi_heater_mode_changed').trigger(this, { mode: changes.wifi_heater_mode.to }, {}).catch(this.error);
    }
  }
}
module.exports = WiFiHeaterDevice;
