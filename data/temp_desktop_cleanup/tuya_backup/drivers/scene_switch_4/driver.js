'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SceneSwitch4Driver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('SceneSwitch4Driver v5.5.696 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const homey = this.homey;
    const driverId = 'scene_switch_4';

    const mainTriggers = [
      'scene_switch_4_button_pressed',
      'scene_switch_4_button_double_press',
      'scene_switch_4_button_long_press'
    ];

    for (const triggerId of mainTriggers) {
      try {
        const card = homey.flow.getDeviceTriggerCard(triggerId);
        if (card) {
          card.registerRunListener(async (args, state) => {
            if (!args.device) return false;
            if (args.button && state.button) {
              return String(args.button) === String(state.button);
            }
            return true;
          });
          this.log(`[FLOW] ✅ ${triggerId}`);
        }
      } catch (e) {
        // Card may not exist
      }
    }

    const buttonPressTypes = ['pressed', 'double', 'long'];
    for (let i = 1; i <= 4; i++) {
      for (const pressType of buttonPressTypes) {
        const buttonTriggerId = `${driverId}_button_${i}_${pressType}`;
        try {
          const card = homey.flow.getDeviceTriggerCard(buttonTriggerId);
          if (card) {
            card.registerRunListener(async (args, state) => {
              if (!args.device) return false;
              return true;
            });
            this.log(`[FLOW] ✅ ${buttonTriggerId}`);
          }
        } catch (e) {
          // Card may not exist
        }
      }
    }

    try {
      const batteryCard = homey.flow.getDeviceTriggerCard('scene_switch_4_battery_changed');
      if (batteryCard) {
        batteryCard.registerRunListener(async (args, state) => true);
        this.log('[FLOW] ✅ scene_switch_4_battery_changed');
      }
    } catch (e) {
      // Card may not exist
    }

    this.log('[FLOW] Scene Switch 4 flow cards registration complete');
  }

}

module.exports = SceneSwitch4Driver;
