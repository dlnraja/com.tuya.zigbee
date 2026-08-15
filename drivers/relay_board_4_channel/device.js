'use strict';

/**
 * 4-channel relay board (TS0004 multi-endpoint) — single device, 4 gangs.
 * Forum #2131 (TBoy): multi-subdevice tiles broke gang2/3/4 flow UX ("shows as switch").
 * Align with switch_4gang: onoff + onoff.gang2/3/4 via UnifiedSwitchBase.
 */
let UnifiedSwitchBase;
try {
  UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
  if (!UnifiedSwitchBase) {throw new Error('UnifiedSwitchBase is undefined');}
} catch (_e) {
  const { ZigBeeDevice } = require('homey-zigbeedriver');
  UnifiedSwitchBase = ZigBeeDevice;
}

const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

const BaseClass = typeof UnifiedSwitchBase === 'function'
  ? PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase))
  : UnifiedSwitchBase;

class RelayBoard4ChannelDevice extends BaseClass {
  get gangCount() { return 4; }

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    try {
      // Legacy multi-tile pairing used subDeviceId; keep ZCL ep mapping if still present.
      const { subDeviceId } = this.getData();
      if (subDeviceId && subDeviceId !== 'main' && typeof this.registerCapability === 'function') {
        const epMap = { secondSwitch: 2, thirdSwitch: 3, fourthSwitch: 4 };
        const ep = epMap[subDeviceId] || 1;
        this._subDeviceId = subDeviceId;
        const { CLUSTER } = require('zigbee-clusters');
        this.registerCapability('onoff', CLUSTER.ON_OFF, { endpoint: ep });
        this.log('[RELAY-4CH] legacy subdevice mode ep=', ep);
        return;
      }

      await super.onNodeInit({ zclNode });
      if (typeof this.initPhysicalButtonDetection === 'function') {
        await this.initPhysicalButtonDetection(zclNode);
      }
      if (typeof this.initVirtualButtons === 'function') {
        await this.initVirtualButtons();
      }
      this.log('[RELAY-4CH] multi-gang init OK');
    } catch (err) {
      this.error('[RELAY-4CH] init error:', err.message);
      this.setUnavailable('Driver initialization incomplete').catch(() => {});
    }
  }

  onDeleted() {
    this.log('4 Channel Relay Board removed', this._subDeviceId || 'main');
    if (typeof super.onDeleted === 'function') {super.onDeleted();}
  }
}

module.exports = RelayBoard4ChannelDevice;
