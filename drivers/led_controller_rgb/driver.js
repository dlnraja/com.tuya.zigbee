'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LedControllerRgbDriver extends ZigBeeDriver {
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
    this.log('LedControllerRgbDriver initialized');
    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => { try { (() => { try { return this.homey.flow.getDeviceActionCard(id); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })().registerRunListener(fn); } catch (e) { this.log('[Flow]', id, e.message); } };
    reg('led_controller_rgb_turn_on', async ({ device }) => { await device.triggerCapabilityListener('onoff', true); return true; });
    // v5.13.3: Condition handler
      (() => { try { return this.homey.flow.getDeviceConditionCard('led_controller_rgb_is_on'); } catch(e) { return null; } })();
      (() => { try { return this.homey.flow.getDeviceActionCard('led_controller_rgb_set_brightness'); } catch(e) { return null; } })();

    reg('led_controller_rgb_turn_off', async ({ device }) => { await device.triggerCapabilityListener('onoff', false); return true; });
    reg('led_controller_rgb_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.triggerCapabilityListener('onoff', !v); return true; });

  }

}

module.exports = LedControllerRgbDriver;
