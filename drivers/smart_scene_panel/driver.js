'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartScenePanelDriver extends ZigBeeDriver {
  async onInit() {
    /* P131-AUTO-FLOW-LISTENERS */

    try {
      const __card = this.homey.flow.getActionCard('smart_scene_panel_set_switch_1');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const v = !!(args.value ?? args.state ?? args.onoff);
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff', v).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff', v).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] smart_scene_panel_set_switch_1:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('smart_scene_panel_set_switch_2');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const v = !!(args.value ?? args.state ?? args.onoff);
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff.2', v).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff.2', v).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] smart_scene_panel_set_switch_2:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('smart_scene_panel_set_switch_3');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const v = !!(args.value ?? args.state ?? args.onoff);
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff.3', v).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff.3', v).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] smart_scene_panel_set_switch_3:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('smart_scene_panel_set_switch_4');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const v = !!(args.value ?? args.state ?? args.onoff);
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff.4', v).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff.4', v).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] smart_scene_panel_set_switch_4:', e.message); }
    /* P131-AUTO-FLOW-LISTENERS-END */

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
        await args.device['setCapabilityValue'](`onoff.gang${g}`, args.state);
        await args.device.sendDP(23 + g, 1, args.state ? 1 : 0);
      });
    }

    this.log('SmartScenePanelDriver flow cards registered');
  }
}

module.exports = SmartScenePanelDriver;
