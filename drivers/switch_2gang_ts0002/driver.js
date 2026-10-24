'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');
const { setGangOnOff, setAllGangsOnOff } = require('../../lib/drivers/FlowGangControl');

// P3021c: dedicated TS0002-only 2-gang driver (see device.js for the why).
// Flow cards mirror the relay subset of wall_switch_2gang_1way under this driver's own prefix;
// the BSEED-only E001 cards (backlight, scene, switch type) are not declared here.
const P = 'switch_2gang_ts0002';

class Switch2GangTs0002Driver extends BaseZigBeeDriver {

  async onInit() {
    if (typeof super.onInit === 'function') { await super.onInit(); }
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    this._registerFlowCards();
  }

  _action(id, run) {
    try {
      const card = this.homey.flow.getActionCard(id);
      if (!card) { return; }
      card.registerRunListener(async (args) => {
        if (!args || !args.device) { return false; }
        await run(args.device, args);
        return true;
      });
    } catch (err) {
      this.error(`[${P}] action ${id}: ${err.message}`);
    }
  }

  _condition(id, run) {
    try {
      const card = this.homey.flow.getConditionCard(id);
      if (!card) { return; }
      card.registerRunListener(async (args) => {
        if (!args || !args.device) { return false; }
        return run(args.device, args);
      });
    } catch (err) {
      this.error(`[${P}] condition ${id}: ${err.message}`);
    }
  }

  _registerFlowCards() {
    // is_on / turn_on / turn_off / toggle on gang 1 (stable-v5 has no ActuatorFlowHelper:
    // same cards wired locally through FlowGangControl).
    this._condition(`${P}_is_on`, (d) => d.getCapabilityValue('onoff') === true);
    this._action(`${P}_turn_on`, (d) => setGangOnOff(d, 1, true));
    this._action(`${P}_turn_off`, (d) => setGangOnOff(d, 1, false));
    this._action(`${P}_toggle`, (d) => setGangOnOff(d, 1, 'toggle'));
    for (const gang of [1, 2]) {
      this._action(`${P}_turn_on_gang${gang}`, (d) => setGangOnOff(d, gang, true));
      this._action(`${P}_turn_off_gang${gang}`, (d) => setGangOnOff(d, gang, false));
      this._action(`${P}_toggle_gang${gang}`, (d) => setGangOnOff(d, gang, 'toggle'));
    }
    this._action(`${P}_turn_on_all`, (d) => setAllGangsOnOff(d, 2, true));
    this._action(`${P}_turn_off_all`, (d) => setAllGangsOnOff(d, 2, false));
    this._action(`${P}_set_power_on_behavior`, async (d, args) => {
      await d.setSettings({ power_on_behavior: args.mode });
    });
  }
}

module.exports = Switch2GangTs0002Driver;
