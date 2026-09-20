'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');
const { shouldRunForDeviceAndButton } = require('../../lib/FlowCardHelper');

/**
 * Button 1-Gang Driver — flow IDs must match driver.flow.compose.json
 * WHY(P2630): never require args.device on device triggers (Homey omits it).
 */
class Button1GangDriver extends BaseZigBeeDriver {

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('Button1GangDriver P2630 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const mainTriggers = [
      'button_wireless_1_button_1gang_button_pressed',
      'button_wireless_1_button_1gang_button_double_press',
      'button_wireless_1_button_1gang_button_long_press',
      'button_wireless_1_button_1gang_button_multi_press',
    ];
    const button1Triggers = [
      'button_wireless_1_button_1gang_button_1_pressed',
      'button_wireless_1_button_1gang_button_1_double',
      'button_wireless_1_button_1gang_button_1_long',
      'button_wireless_1_button_1gang_button_1_triple',
      'button_wireless_1_button_1gang_button_1_release',
    ];
    const extras = [
      'button_wireless_1_battery_low',
      'button_wireless_1_button_1gang_button_scene_recall',
    ];

    for (const triggerId of [...mainTriggers, ...button1Triggers, ...extras]) {
      try {
        const card = this._getFlowCard(triggerId, 'trigger');
        if (!card) continue;
        card.registerRunListener(async (args = {}, state = {}) => shouldRunForDeviceAndButton(args, state));
        this.log(`[FLOW] Registered: ${triggerId}`);
      } catch (e) {
        this.log(`[FLOW] ${triggerId} not available: ${e.message}`);
      }
    }
  }
}

module.exports = Button1GangDriver;
