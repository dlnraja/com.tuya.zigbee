'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { setActuatorCapability } = require('../../lib/flow/ActuatorFlowHelper');

class WallThermostatDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;

    const reg = (id, value) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (!card) { return; }
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          return setActuatorCapability(args.device, 'child_lock', value);
        });
      } catch (err) {
        this.log(`[FLOW] ${id}: ${err.message}`);
      }
    };

    reg('wall_thermostat_enable_child_lock', true);
    reg('wall_thermostat_disable_child_lock', false);
    this.log('[FLOW] Wall thermostat child-lock actions registered (P130)');
  }
}

module.exports = WallThermostatDriver;
