'use strict';
const { safeMultiply } = require('../../lib/utils/tuyaUtils.js');

let UnifiedCoverBase;
try {
  UnifiedCoverBase = require('../../lib/devices/UnifiedCoverBase');
} catch (e) {
  const { ZigBeeDevice } = require('homey-zigbeedriver');
  UnifiedCoverBase = ZigBeeDevice;
}

class WallCurtainSwitchDevice extends UnifiedCoverBase {
  async onNodeInit({ zclNode }) {
    this.log('[WALL_CURTAIN_SWITCH] init');

    // v5.13.1: CRITICAL FIX  must call super to initialize protocol detection,
    // Tuya DP, capability migration, and ZCL fallbacks from UnifiedCoverBase
    await super.onNodeInit({ zclNode }).catch(e => this.log('[WALL_CURTAIN_SWITCH] super.onNodeInit warn:', e.message));

    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapabilityListener('windowcoverings_set', async (value) => {
        this.log('[WALL_CURTAIN_SWITCH] set position:', value);
        const ep = zclNode.endpoints[1];
        if (ep && ep.clusters && ep.clusters.windowCovering) {
          await ep.clusters.windowCovering.goToLiftPercentage({ percentageLiftValue: Math.round(value) });
        }
      });
    }

    if (this.hasCapability('windowcoverings_state')) {
      this.registerCapabilityListener('windowcoverings_state', async (value) => {
        this.log('[WALL_CURTAIN_SWITCH] state:', value);
        const ep = zclNode.endpoints[1];
        if (!ep || !ep.clusters || !ep.clusters.windowCovering) return;
        if (value === 'up') await ep.clusters.windowCovering.upOpen();
        else if (value === 'down') await ep.clusters.windowCovering.downClose();
        else await ep.clusters.windowCovering.stop();
      });
    }

    this.log('[WALL_CURTAIN_SWITCH] ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WallCurtainSwitchDevice;

