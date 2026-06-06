'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

class SmartScenePanelDevice extends TuyaZigbeeDevice {
  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode }).catch(() => {});
    if (this.mainsPowered && this.hasCapability('measure_battery')) {
      this.log('[SCENE-PANEL] Mains powered device detected. Dynamically pruning battery capability...');
      await this.removeCapability('measure_battery').catch(() => {});
    }
    this.log('[SCENE-PANEL] v5.13.5 init');for (let g = 1; g <= 4; g++) {
      const cap = `onoff.gang${g}`;
      const dp = 23 + g;
      if (this.hasCapability(cap)) {
        this.registerCapabilityListener(cap, async (value) => {
          await this.sendDP(dp, 1, value ? 1 : 0);
      });
      }
    }
    // Register custom flow action listeners
    for (let g = 1; g <= 4; g++) {
      const actionId = `sensor_climate_smart_climate_sensor_smart_smart_scene_panel_set_switch_${g}`;
      const actionCard = (() => { try { return this.homey.flow.getActionCard(actionId); } catch (e) { return null; } })();
      if (actionCard) {
        actionCard.registerRunListener(async (args) => {
          this.log(`[SCENE-PANEL] Flow action set switch ${g} to ${args.state}`);
          const cap = `onoff.gang${g}`;
          if (this.hasCapability(cap)) {
            await this.setCapabilityValue(cap, !!args.state).catch(() => {});
          }
          const dp = 23 + g;
          await this.sendDP(dp, 1, args.state ? 1 : 0);
        });
      }
    }

    this._setupDPReporting();
  }

  _setupDPReporting() {
    if (this.ef00Manager) {
      this.ef00Manager.on('dp', ({ dp, value }) => this._handleDP(dp, value));
    }
  }

  _handleDP(dp, value) {
    if (dp >= 24 && dp <= 27) {
      const g = dp - 23;
      const cap = `onoff.gang${g}`;
      if (this.hasCapability(cap)) {
        await this.setCapabilityValue(cap, !!value).catch(this.error);
      }
      const flowCardId = `sensor_climate_smart_climate_sensor_smart_smart_scene_panel_switch_${g}_changed`;
      (() => { try { return this.homey.flow.getTriggerCard(flowCardId); } catch(e) { return null; } })()?.trigger(this, { state: !!value }, {}).catch(() => {})
    } else if (dp >= 5 && dp <= 8) {
      (() => { try { return this.homey.flow.getTriggerCard('sensor_climate_smart_climate_sensor_smart_smart_scene_panel_scene_activated'); } catch(e) { return null; } })()?.trigger(this, { scene: String(dp) }, { scene: String(dp) }).catch(() => {})
    } else if (dp === 38) {
      this.log(`[SCENE-PANEL] relay_status=${value}`);
    } else if (dp === 106) {
      this.log(`[SCENE-PANEL] pir_delay=${value}`);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('power_on_behavior')) {
      const map = { off: 0, on: 1, memory: 2 };
      await this.sendDP(38, 4, map[newSettings.power_on_behavior] || 2);
    }
    if (changedKeys.includes('backlight')) {
      await this.sendDP(36, 1, newSettings.backlight ? 1 : 0);
    }
    if (changedKeys.includes('pir_delay')) {
      await this.sendDP(106, 2, newSettings.pir_delay);
    }
  }

  async sendDP(dp, type, value) {
    if (this.ef00Manager) {
      await this.ef00Manager.sendDP(dp, type, value);
    }
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SmartScenePanelDevice;




