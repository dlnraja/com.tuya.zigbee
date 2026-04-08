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
    const reg = (id, fn) => { try { (() => { try { return this.homey.flow.getDeviceActionCard(id); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })().registerRunListener(fn); } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('smart_heater_turn_on', async ({ device }) => { await device.triggerCapabilityListener('onoff', true); return true; });
    // v5.13.3: Condition handler
      (() => { try { return this.homey.flow.getDeviceConditionCard('smart_heater_is_on'); } catch(e) { return null; } })();
      (() => { try { return this.homey.flow.getDeviceActionCard('smart_heater_set_temperature'); } catch(e) { return null; } })();

    reg('smart_heater_turn_off', async ({ device }) => { await device.triggerCapabilityListener('onoff', false); return true; });
    reg('smart_heater_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.triggerCapabilityListener('onoff', !v); return true; });

  }

}

module.exports = SmartHeaterDriver;
