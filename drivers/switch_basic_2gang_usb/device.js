'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * Switch Basic 2-Gang USB - TS0002
 * 1 AC Socket + 2 USB Ports
 * Manufacturer: _TZ3000_h1ipgkwn
 */
module.exports = class SwitchBasic2GangUsb extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[TS0002-2GANG] 🔌 USB 2-Port Module initializing...');
    this.zclNode = zclNode;

    // Listeners pour retour d'état USB Port 1 (Endpoint 1)
    if (zclNode.endpoints[1] && zclNode.endpoints[1].clusters.onOff) {
      zclNode.endpoints[1].clusters.onOff.on('attr.onOff', value => {
        this.log('[TS0002-2GANG] EP1 (USB 1) attr.onOff =', value);
        this.setCapabilityValue('onoff.l1', value).catch(this.error);
      });
    }

    // Listeners pour retour d'état USB Port 2 (Endpoint 2)
    if (zclNode.endpoints[2] && zclNode.endpoints[2].clusters.onOff) {
      zclNode.endpoints[2].clusters.onOff.on('attr.onOff', value => {
        this.log('[TS0002-2GANG] EP2 (USB 2) attr.onOff =', value);
        this.setCapabilityValue('onoff.l2', value).catch(this.error);
      });
    }

    // Actions depuis Homey vers le device - USB Port 1
    this.registerCapabilityListener('onoff.l1', async value => {
      this.log('[TS0002-2GANG] set onoff.l1 (USB 1) ->', value);
      const ep = zclNode.endpoints[1];
      if (ep && ep.clusters.onOff) {
        await ep.clusters.onOff[value ? 'setOn' : 'setOff']();
      }
    });

    // Actions depuis Homey vers le device - USB Port 2
    this.registerCapabilityListener('onoff.l2', async value => {
      this.log('[TS0002-2GANG] set onoff.l2 (USB 2) ->', value);
      const ep = zclNode.endpoints[2];
      if (ep && ep.clusters.onOff) {
        await ep.clusters.onOff[value ? 'setOn' : 'setOff']();
      }
    });

    this.log('[TS0002-2GANG] ✅ USB 2-Port Module initialized!');
  }
};
