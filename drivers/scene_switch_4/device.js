'use strict';

// v5.5.351: FIX - Import error corrected (was using destructuring on non-destructured export)
// v5.5.319: Scene switches are BUTTON devices, not on/off switches!
// Eftychis report: "4 gang switches work only via iconic buttons. The real buttons do not react"
// v5.9.3: Added E000 + onOff command detection (was completely missing)
const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');

class SceneSwitch4Device extends ButtonDevice {
  get buttonCount() { return 4; }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    this.log('[SCENE-4] v5.9.3 - Initializing with E000 support...');
    await super.onNodeInit({ zclNode });
    await this._setupE000Detection(zclNode);
    this.log('[SCENE-4] Ready');
  }

  async _setupE000Detection(zclNode) {
    this._e000Dedup = {};
    for (let ep = 1; ep <= 4; ep++) {
      const endpoint = zclNode?.endpoints?.[ep];
      if (!endpoint ) continue;
      const e000 = endpoint.clusters?.tuyaE000 || endpoint.clusters?.[57344];
      if (e000?.on) {
        e000.on('buttonPress', async ({ button, pressType }) => {
          await this.triggerButtonPress((button >= 1 && button <= 4) ? button : ep, resolvePressType(pressType, 'SCENE4'));
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
      for (let ep = 1; ep <= 4; ep++) {
        const endpoint = zclNode?.endpoints?.[ep];
        if (!endpoint ) continue;
        const bc = new TuyaE000BoundCluster({
          device: this,
          onButtonPress: async (b, t) => this.triggerButtonPress((b >= 1 && b <= 4) ? b : ep, t)
        });
        bc.endpoint = ep;
        if (!endpoint.bindings) endpoint.bindings = {};
        endpoint.bindings['tuyaE000'] = bc;
      }
    } catch (e) { /* ok */ }
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = SceneSwitch4Device;

