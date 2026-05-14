'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * SmartScenePanelDevice - v5.13.6 Hardened Architecture
 */
class SmartScenePanelDevice extends TuyaZigbeeDevice {

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    this.log('[ScenePanel] 🚀 Initializing hardened driver...');
    await super.onNodeInit({ zclNode });

    // 1. Gang Capabilities Setup
    for (let g = 1; g <= 4; g++) {
      const cap = `onoff.gang${g}`;
      if (this.hasCapability(cap)) {
        this.registerCapabilityListener(cap, async (value) => {
          this.log(`[ScenePanel] Setting gang ${g}: ${value}`);
          return this.sendTuyaCommand(23 + g, value, 'bool');
        });
      }
    }

    this.log('[ScenePanel] ✅ Ready');
  }

  /**
   * handleTuyaDataReport - Hardened DP Processing
   */
  async handleTuyaDataReport(data) {
    if (!data || data.dp == null) return;
    
    const value = data.data ?? data.value;
    const dpId = data.dp;

    // 1. Gang Status (DP 24-27)
    if (dpId >= 24 && dpId <= 27) {
      const g = dpId - 23;
      const cap = `onoff.gang${g}`;
      const state = !!value;
      
      await this.setCapabilityValue(cap, state);
      
      // Trigger Flow Card
      try {
        const trigger = this.homey.flow.getDeviceTriggerCard(`smart_scene_panel_switch_${g}_changed`);
        if (trigger) {
          await trigger.trigger(this, { state }, {});
        }
      } catch (e) {}
    } 
    // 2. Scene Buttons (DP 5-8)
    else if (dpId >= 5 && dpId <= 8) {
      this.log(`[ScenePanel] 🔘 Button ${dpId} activated`);
      try {
        const trigger = this.homey.flow.getDeviceTriggerCard('smart_scene_panel_scene_activated');
        if (trigger) {
          await trigger.trigger(this, { scene: String(dpId) }, { scene: String(dpId) });
        }
      } catch (e) {}
    }
    // 3. System DPs
    else if (dpId === 38) {
      this.log(`[ScenePanel] Relay status report: ${value}`);
    } else if (dpId === 106) {
      this.log(`[ScenePanel] PIR delay report: ${value}`);
    }
  }

  async onSettings({ newSettings, changedKeys }) {
    for (const key of changedKeys) {
      switch (key) {
        case 'power_on_behavior': {
          const map = { off: 0, on: 1, memory: 2 };
          await this.sendTuyaCommand(38, map[newSettings[key]] ?? 2, 'enum');
          break;
        }
        case 'backlight':
          await this.sendTuyaCommand(36, newSettings[key], 'bool');
          break;
        case 'pir_delay':
          await this.sendTuyaCommand(106, newSettings[key], 'value');
          break;
      }
    }
  }

}

module.exports = SmartScenePanelDevice;
