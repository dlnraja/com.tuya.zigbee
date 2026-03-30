'use strict';

let HybridCoverBase;
try {
  HybridCoverBase = require('../../lib/devices/HybridCoverBase');
} catch (e) {
  const { ZigBeeDevice } = require('homey-zigbeedriver');
  HybridCoverBase = ZigBeeDevice;
}

class WallCurtainSwitchDevice extends HybridCoverBase {
  async onNodeInit({ zclNode }) {
    this.log('[WALL_CURTAIN_SWITCH] init');

    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapabilityListener('windowcoverings_set', async (value) => {
        this.log('[WALL_CURTAIN_SWITCH] set position:', value);
        const ep = zclNode.endpoints[1];
        if (ep && ep.clusters && ep.clusters.windowCovering) {
          await ep.clusters.windowCovering.goToLiftPercentage({ percentageLiftValue: Math.round(value * 100) });
        }
      });
    }

    if (this.hasCapability('windowcoverings_state')) {
      this.registerCapabilityListener('windowcoverings_state', async (value) => {
        this.log('[WALL_CURTAIN_SWITCH] s
    await super.onNodeInit({ zclNode });
tate:', value);
        const ep = zclNode.endpoints[1];
        if (!ep || !ep.clusters || !ep.clusters.windowCovering) return;
        if (value === 'up') await ep.clusters.windowCovering.upOpen();
        else if (value === 'down') await ep.clusters.windowCovering.downClose();
        else await ep.clusters.windowCovering.stop();
      });
    }

    this.log('[WALL_CURTAIN_SWITCH] ready');
  }
}

module.exports = WallCurtainSwitchDevice;