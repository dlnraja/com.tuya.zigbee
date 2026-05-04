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

    // Register scene trigger card safely
    try {
      const sceneTrigger = this.homey.flow.getTriggerCard('smart_scene_panel_scene_activated');
      if (sceneTrigger) {
        sceneTrigger.registerRunListener(async (args, state) => {
          return !args.scene || args.scene === state.scene;
        });
      }
    } catch (err) {
      this.error('[FLOW] Failed to register scene_activated trigger:', err.message);
    }

    // Switch changed triggers (1-4) - defensive registration
    for (let g = 1; g <= 4; g++) {
      try {
        const cardId = `smart_scene_panel_switch_${g}_changed`;
        const card = this.homey.flow.getTriggerCard(cardId);
        if (card) card.registerRunListener(async () => true);
      } catch (err) {
        this.error(`[FLOW] Failed to register switch_${g}_changed:`, err.message);
      }
    }

    // Action cards: set switch - defensive registration
    for (let g = 1; g <= 4; g++) {
      try {
        const cardId = `smart_scene_panel_set_switch_${g}`;
        const card = this.homey.flow.getActionCard(cardId);
        if (card) {
          card.registerRunListener(async (args, state) => {
            try {
              await args.device.triggerCapabilityListener(`onoff.gang${g}`, args.state);
              await args.device.sendDP(23 + g, 1, args.state ? 1 : 0);
            } catch (e) {
              this.error('[FLOW] set_switch action failed:', e.message);
            }
          });
        }
      } catch (err) {
        this.error(`[FLOW] Failed to register set_switch_${g}:`, err.message);
      }
    }

    this.log('SmartScenePanelDriver flow cards registered');
  }
}

module.exports = SmartScenePanelDriver;
