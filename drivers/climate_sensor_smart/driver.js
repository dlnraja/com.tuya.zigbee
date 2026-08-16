'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * Flow card ids are prefixed with this driver's own id. They previously carried
 * the `smart_scene_panel_` prefix copied from the sibling driver, so the run
 * listeners attached to that driver's cards while all nine cards declared here
 * got none — the scene filter never applied and the four "set switch" actions
 * silently did nothing.
 */
const CARD_PREFIX = 'climate_sensor_smart_scene_panel';

class ClimateSensorSmartScenePanelDriver extends ZigBeeDriver {
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
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;

    this.log('ClimateSensorSmartScenePanelDriver initialized');

    // Scene activated trigger with scene filter
    try {
      const sceneTrigger = this._getFlowCard(`${CARD_PREFIX}_scene_activated`, 'trigger');
      if (sceneTrigger) {
        sceneTrigger.registerRunListener(async (args, state) => !args.scene || args.scene === state.scene);
      }
    } catch (err) {
      this.error('[FLOW] Failed to register scene_activated:', err.message);
    }

    // Switch changed triggers (1-4)
    for (let g = 1; g <= 4; g++) {
      try {
        const card = this._getFlowCard(`${CARD_PREFIX}_switch_${g}_changed`, 'trigger');
        if (card) {
          card.registerRunListener(async () => true);
        }
      } catch (err) {
        this.error(`[FLOW] Failed to register switch_${g}_changed:`, err.message);
      }
    }

    // Action cards: set switch
    for (let g = 1; g <= 4; g++) {
      try {
        const card = this._getFlowCard(`${CARD_PREFIX}_set_switch_${g}`, 'action');
        if (card) {
          card.registerRunListener(async (args) => {
            if (args.device) {
              await args.device['setCapabilityValue'](`onoff.gang${g}`, args.state);
              if (args.device.sendDP) {
                await args.device.sendDP(23 + g, 1, args.state ? 1 : 0);
              }
            }
            return true;
          });
        }
      } catch (err) {
        this.error(`[FLOW] Failed to register set_switch_${g}:`, err.message);
      }
    }

    this.log('ClimateSensorSmartScenePanelDriver flow cards registered');
  }
}

module.exports = ClimateSensorSmartScenePanelDriver;

