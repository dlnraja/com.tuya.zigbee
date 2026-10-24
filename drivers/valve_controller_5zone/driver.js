'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

const D = 'valve_controller_5zone';
const capOf = (g) => g === 1 ? 'onoff' : `onoff.gang${g}`;

class ValveController5ZoneDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    for (let g = 1; g <= 5; g++) {
      const cap = capOf(g);
      this._cond(`${D}_zone${g}_is_on`, async ({ device }) => device.getCapabilityValue(cap) === true);
      this._act(`${D}_zone${g}_on`, ({ device }) => device.triggerCapabilityListener(cap, true));
      this._act(`${D}_zone${g}_off`, ({ device }) => device.triggerCapabilityListener(cap, false));
      this._act(`${D}_zone${g}_toggle`, ({ device }) => device.triggerCapabilityListener(cap, device.getCapabilityValue(cap) !== true));
    }
    this._act(`${D}_all_off`, async ({ device }) => {
      for (let g = 1; g <= 5; g++) {
        if (device.hasCapability(capOf(g))) {await device.triggerCapabilityListener(capOf(g), false).catch(() => {});}
      }
    });
  }

  _cond(id, fn) {
    try { this.homey.flow.getConditionCard(id).registerRunListener(async (args) => args.device ? fn(args) : false); } catch (e) { this.error(`condition ${id}: ${e.message}`); }
  }

  _act(id, fn) {
    try { this.homey.flow.getActionCard(id).registerRunListener(async (args) => { if (!args.device) {return false;} await fn(args); return true; }); } catch (e) { this.error(`action ${id}: ${e.message}`); }
  }
}

module.exports = ValveController5ZoneDriver;
