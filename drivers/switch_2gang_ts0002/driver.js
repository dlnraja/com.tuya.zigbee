'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');
const { setGangOnOff, setAllGangsOnOff } = require('../../lib/drivers/FlowGangControl');
const { registerOnoffFlowCards } = require('../../lib/flow/ActuatorFlowHelper');

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

  static _action(driver, id, run) {
    try {
      const card = driver.homey.flow.getActionCard(id);
      if (!card) { return; }
      card.registerRunListener(async (args) => {
        if (!args || !args.device) { return false; }
        await run(args.device, args);
        return true;
      });
    } catch (err) {
      driver.error(`[${P}] action ${id}: ${err.message}`);
    }
  }

  /** P3331: also run by the dormant host (switch_plug_1) while this driver is held out of the payload. */
  static registerFlowCards(driver) {
    // is_on / turn_on / turn_off / toggle on gang 1
    registerOnoffFlowCards(driver, P, { gang: 1, capability: 'onoff' });
    const action = (id, run) => Switch2GangTs0002Driver._action(driver, id, run);
    for (const gang of [1, 2]) {
      action(`${P}_turn_on_gang${gang}`, (d) => setGangOnOff(d, gang, true));
      action(`${P}_turn_off_gang${gang}`, (d) => setGangOnOff(d, gang, false));
      action(`${P}_toggle_gang${gang}`, (d) => setGangOnOff(d, gang, 'toggle'));
    }
    action(`${P}_turn_on_all`, (d) => setAllGangsOnOff(d, 2, true));
    action(`${P}_turn_off_all`, (d) => setAllGangsOnOff(d, 2, false));
    action(`${P}_set_power_on_behavior`, async (d, args) => {
      await d.setSettings({ power_on_behavior: args.mode });
    });
  }

  _registerFlowCards() { Switch2GangTs0002Driver.registerFlowCards(this); }
}

module.exports = Switch2GangTs0002Driver;
