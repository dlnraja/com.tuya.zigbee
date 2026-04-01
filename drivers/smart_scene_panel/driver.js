'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartScenePanelDriver extends ZigBeeDriver {
  async onInit() {
    this.log('SmartScenePanelDriver initialized');

    // Scene activated trigger with scene filter
    const sceneTrigger = this.homey.flow.getDeviceTriggerCard('smart_scene_panel_scene_activated');
    sceneTrigger.registerRunListener(async (args, state) => {
      return !args.scene || args.scene === state.scene;
    });

    // Switch changed triggers (1-4)
    for (let g = 1; g <= 4; g++) {
      const card = this.homey.flow.getDeviceTriggerCard(`smart_scene_panel_switch_${g}_changed`);
      card.registerRunListener(async () => true);
    }

    // Action cards: set switch
    for (let g = 1; g <= 4; g++) {
      const card = this.homey.flow.getActionCard(`smart_scene_panel_set_switch_${g}`);
      card.registerRunListener(async (args, state) => {
        await args.device.triggerCapabilityListener(`onoff.gang${g}`, args.state);
        await args.device.sendDP(23 + g, 1, args.state ? 1 : 0);
      });
    }

    this.log('SmartScenePanelDriver flow cards registered');
  }
}

module.exports = SmartScenePanelDriver;
