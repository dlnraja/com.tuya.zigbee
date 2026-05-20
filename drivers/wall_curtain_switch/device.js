'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * WallCurtainSwitchDevice - v5.13.6 Hardened Architecture
 */
class WallCurtainSwitchDevice extends PhysicalButtonMixin(VirtualButtonMixin(TuyaZigbeeDevice)) {

  get mainsPowered() { return true; }
  get gangCount() { return 1; }

  async onNodeInit({ zclNode }) {
    this.log('[WallCurtain] 🚀 Initializing hardened driver...');
    await super.onNodeInit({ zclNode });
    await this.initVirtualButtons();

    // 1. Capability Listeners
    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapabilityListener('windowcoverings_set', async (value) => {
        this.log(`[WallCurtain] Setting position: ${value}`);
        const endpoint = this.zclNode.endpoints[1];
        if (endpoint?.clusters?.windowCovering) {
          return endpoint.clusters.windowCovering.goToLiftPercentage({
            percentageLiftValue: Math.round(value * 100)
          });
        }
      });
    }

    if (this.hasCapability('windowcoverings_state')) {
      this.registerCapabilityListener('windowcoverings_state', async (value) => {
        this.log(`[WallCurtain] Setting state: ${value}`);
        const endpoint = this.zclNode.endpoints[1];
        if (!endpoint?.clusters?.windowCovering) {return;}

        switch (value) {
          case 'up': return endpoint.clusters.windowCovering.upOpen();
          case 'down': return endpoint.clusters.windowCovering.downClose();
          default: return endpoint.clusters.windowCovering.stop();
        }
      });
    }

    this.log('[WallCurtain] ✅ Ready');
  }

}

module.exports = WallCurtainSwitchDevice;
