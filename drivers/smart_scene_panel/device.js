'use strict';

// P24.7: Safe import for TuyaZigbeeDevice (crash-resilient)
const { safeExtends } = require('../../lib/utils/ClassExtendsGuard');
const TuyaZigbeeDevice = safeExtends('TuyaZigbeeDevice', () => {
  return require('../../lib/tuya/TuyaZigbeeDevice');
});

class SmartScenePanelDevice extends TuyaZigbeeDevice {
  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    // Auto-fix: Remove battery capabilities for mains-powered devices
    await this.removeCapability('measure_battery').catch(() => {});
    await this.removeCapability('alarm_battery').catch(() => {});
    await super.onNodeInit({ zclNode });
    this.log('[SCENE-PANEL] v5.13.5 init');
    // Ecosystems (Matter Bridge / Alexa / Google) read only exact `onoff`, never onoff.gangN.
    // Additive main switch mirroring gang 1 (DP24); gang capabilities stay untouched.
    if (!this.hasCapability('onoff')) {
      await this.addCapability('onoff').catch((e) => this.log('[SCENE-PANEL] add onoff mirror:', e.message));
    }
    for (let g = 1; g <= 4; g++) {
      const cap = `onoff.gang${g}`;
      const dp = 23 + g;
      if (this.hasCapability(cap)) {
        this.registerCapabilityListener(cap, async (value) => {
          await this.sendDP(dp, 1, value ? 1 : 0);
          if (g === 1) {this._mirrorMainOnoff(!!value);}
        });
      }
    }
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        await this.sendDP(24, 1, value ? 1 : 0);
        if (this.hasCapability('onoff.gang1')) {
          this.safeSetCapabilityValue('onoff.gang1', !!value).catch(() => {});
        }
      });
    }
    this._setupDPReporting();
  }

  _setupDPReporting() {
    // R21: register once, keep the handler so onDeleted/onUninit can remove it.
    if (this.ef00Manager && !this._scenePanelDpHandler) {
      this._scenePanelDpHandler = ({ dp, value }) => this._handleDP(dp, value);
      this.ef00Manager.on('dp', this._scenePanelDpHandler);
    }
  }

  _teardownDPReporting() {
    if (this.ef00Manager && this._scenePanelDpHandler) {
      this.ef00Manager.removeListener('dp', this._scenePanelDpHandler);
    }
    this._scenePanelDpHandler = null;
  }

  _handleDP(dp, value) {
    if (dp >= 24 && dp <= 27) {
      const g = dp - 23;
      const cap = `onoff.gang${g}`;
      if (this.hasCapability(cap)) {
        this.safeSetCapabilityValue(cap, !!value).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) { /* logging must never throw */ } }));
      }
      if (g === 1) {this._mirrorMainOnoff(!!value);}
      const flowCardId = `smart_scene_panel_switch_${g}_changed`;
      this.homey.flow.getDeviceTriggerCard(flowCardId).trigger(this, { state: !!value }, {}).catch(() => {})
    } else if (dp >= 5 && dp <= 8) {
      this.homey.flow.getDeviceTriggerCard('smart_scene_panel_scene_activated').trigger(this, { scene: String(dp) }, { scene: String(dp) }).catch(() => {})
    } else if (dp === 38) {
      this.log(`[SCENE-PANEL] relay_status=${value}`);
    } else if (dp === 106) {
      this.log(`[SCENE-PANEL] pir_delay=${value}`);
    }
  }

  _mirrorMainOnoff(value) {
    if (this.hasCapability('onoff')) {
      this.safeSetCapabilityValue('onoff', value).catch(() => {});
    }
  }

  async onSettings({ newSettings, changedKeys }) {
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


  async onUninit() {
    this._teardownDPReporting();
    if (typeof super.onUninit === 'function') { await super.onUninit(); }
  }

  async onDeleted() {
    this._destroyed = true;
    this._teardownDPReporting();
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SmartScenePanelDevice;




