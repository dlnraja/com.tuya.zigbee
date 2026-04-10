'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartHeaterDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }


  async onInit() {
    this.log('SmartHeaterDriver initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try {
      this.homey.flow.getActionCard(id).registerRunListener(fn) } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('smart_heater_turn_on', async ({ device }) => { await device.triggerCapabilityListener('onoff', true); return true; });
    // v5.13.3: Condition handler
      this.homey.flow.getConditionCard('smart_heater_is_on')
      this.homey.flow.getActionCard('smart_heater_set_temperature')

    reg('smart_heater_turn_off', async ({ device }) => { await device.triggerCapabilityListener('onoff', false); return true; });
    reg('smart_heater_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.triggerCapabilityListener('onoff', !v); return true; });

  }

}

module.exports = SmartHeaterDriver;
