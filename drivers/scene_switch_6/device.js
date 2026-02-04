'use strict';

// v5.8.16: Enhanced with E000 cluster support
const ButtonDevice = require('../../lib/devices/ButtonDevice');

class SceneSwitch6Device extends ButtonDevice {
  get buttonCount() { return 6; }

  async onNodeInit({ zclNode }) {
    this.log('[SCENE-6] 🔘 v5.8.16 - Initializing with E000 support...');
    await super.onNodeInit({ zclNode });
    await this._setupE000Detection(zclNode);
    this.log('[SCENE-6] ✅ Ready');
  }

  async _setupE000Detection(zclNode) {
    this._e000Dedup = {};
    for (let ep = 1; ep <= 6; ep++) {
      const endpoint = zclNode?.endpoints?.[ep];
      if (!endpoint) continue;
      const e000 = endpoint.clusters?.tuyaE000 || endpoint.clusters?.[57344];
      if (e000?.on) {
        e000.on('buttonPress', async ({ button, pressType }) => {
          const types = { 0: 'single', 1: 'double', 2: 'long' };
          await this.triggerButtonPress((button >= 1 && button <= 6) ? button : ep, types[pressType] || 'single');
        });
      }
      const onOff = endpoint.clusters?.onOff || endpoint.clusters?.[6];
      if (onOff?.on) {
        const handle = async (cmd, type) => {
          const now = Date.now();
          if (now - (this._e000Dedup[`${ep}_${cmd}`] || 0) < 500) return;
          this._e000Dedup[`${ep}_${cmd}`] = now;
          await this.triggerButtonPress(ep, type);
        };
        onOff.on('commandOn', () => handle('on', 'single'));
        onOff.on('commandOff', () => handle('off', 'double'));
        onOff.on('commandToggle', () => handle('toggle', 'long'));
      }
    }
    try {
      const TuyaE000BoundCluster = require('../../lib/clusters/TuyaE000BoundCluster');
      for (let ep = 1; ep <= 6; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint) continue;
        const bc = new TuyaE000BoundCluster({
          device: this,
          onButtonPress: async (b, t) => this.triggerButtonPress((b >= 1 && b <= 6) ? b : ep, t)
        });
        bc.endpoint = ep;
        if (!endpoint.bindings) endpoint.bindings = {};
        endpoint.bindings[57344] = bc;
      }
    } catch (e) { /* ok */ }
  }
}
module.exports = SceneSwitch6Device;
