'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartScenePanelDriver extends ZigBeeDriver {
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
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('SmartScenePanelDriver initialized');

    // Scene activated trigger with scene filter
    const sceneTrigger = (() => { try { return this.homey.flow.getTriggerCard('smart_scene_panel_scene_activated'); } catch(e) { return null; } })();
    sceneTrigger.registerRunListener(async (args, state) => {
      return !args.scene || args.scene === state.scene;
      });

    // Switch changed triggers (1-4)
    for (let g = 1; g <= 4; g++) {
      const card =

      card.registerRunListener(async () => true);
    }

    // Action cards: set switch
    for (let g = 1; g <= 4; g++) {
      const card =

      card.registerRunListener(async (args, state) => {
        await args.device.triggerCapabilityListener(`onoff.gang${g}`, args.state);
        await args.device.sendDP(23 + g, 1, args.state ? 1 : 0);
      });
    }

    this.log('SmartScenePanelDriver flow cards registered');
  }
}

module.exports = SmartScenePanelDriver;

