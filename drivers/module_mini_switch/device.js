'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const { setupSonoffEwelink, handleSonoffEwlSettings } = require('../../lib/mixins/SonoffEwelinkMixin');

class ModuleMiniSwitchDevice extends HybridSwitchBase {
  get gangCount() { return 1; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    await setupSonoffEwelink(this, zclNode);
    this.log('[MINI-SWITCH] ✅ Ready');
  }
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    await super.onSettings({ oldSettings, newSettings, changedKeys });
    for (var k of changedKeys) {
      await handleSonoffEwlSettings(this, k, newSettings[k]);
    }
  }
}
module.exports = ModuleMiniSwitchDevice;
