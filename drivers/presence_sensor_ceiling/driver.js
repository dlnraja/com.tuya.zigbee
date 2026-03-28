'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CeilingPresenceSensorDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    this.log('Ceiling Presence Sensor Driver v5.13.3 initialized');

    // v5.13.3: Register flow card action handlers
    const reg = (id, fn) => {
      try { this.homey.flow.getActionCard(id).registerRunListener(fn); }
      catch (e) { this.log('[Flow]', id, e.message); }
    };
    reg('presence_sensor_ceiling_turn_on', async ({ device }) => { await device.setCapabilityValue('onoff', true); return true; });
    reg('presence_sensor_ceiling_turn_off', async ({ device }) => { await device.setCapabilityValue('onoff', false); return true; });
    reg('presence_sensor_ceiling_toggle', async ({ device }) => { const v = device.getCapabilityValue('onoff'); await device.setCapabilityValue('onoff', !v); return true; });

    // Condition cards
    const cond = (id, fn) => {
      try { this.homey.flow.getConditionCard(id).registerRunListener(fn); }
      catch (e) { this.log('[Flow]', id, e.message); }
    };
    cond('presence_sensor_ceiling_is_on', async ({ device }) => device.getCapabilityValue('onoff') === true);
    cond('presence_sensor_ceiling_motion_active', async ({ device }) => device.getCapabilityValue('alarm_motion') === true);
  }
}

module.exports = CeilingPresenceSensorDriver;
