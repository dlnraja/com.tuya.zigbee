'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * Wall Remote 4 Gang - Universal Driver (v9.5.0)
 */
class WallRemote4GangDevice extends PhysicalButtonMixin(ZigBeeDevice) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { this.buttonCount = 4;
      await super.onNodeInit({ zclNode  });
      this.log('[WALL4] 🔘 Initialized via Universal Mixin System');
    }, 'onNodeInit');
  }

}

module.exports = WallRemote4GangDevice;
