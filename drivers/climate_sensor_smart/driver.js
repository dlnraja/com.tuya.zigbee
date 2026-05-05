'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ClimateSensorSmartDriver extends ZigBeeDriver {
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

    this.log('ClimateSensorSmartDriver initialized');

    // Safe card getter
    const safeGet = (type, id) => {
      try {
        return type === 'condition'
          ? this.homey.flow.getConditionCard(id)
          : (type === 'action'
            ? this.homey.flow.getActionCard(id)
            : this.homey.flow.getTriggerCard(id));
      } catch (e) { return null; }
    };

    // Scene activated trigger with scene filter
    const sceneTrigger = safeGet('trigger', 'climate_sensor_smart_hybrid_smart_scene_panel_scene_activated');

    if (sceneTrigger) {
      sceneTrigger.registerRunListener(async (args, state) => {
        return !args.scene || args.scene === state.scene;
      });
    }

    // Switch changed triggers (1-4)
    for (let g = 1; g <= 4; g++) {
      try {
        const card = safeGet('trigger', `smart_scene_panel_switch_${g}_changed`);
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
        const card = safeGet('action', `smart_scene_panel_set_switch_${g}`);
        if (card) {
          card.registerRunListener(async (args) => {
            if (args.device) {
              await args.device.triggerCapabilityListener(`onoff.gang${g}`, args.state);
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

    this.log('ClimateSensorSmartDriver flow cards registered');
  }
}

module.exports = ClimateSensorSmartDriver;