'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * 4-channel relay board (TS0004 multi-endpoint).
 * P98: fix onDeleted ReferenceError, drop phantom button.1 listener gap,
 * and drive flows via triggerCapabilityListener so ZCL OnOff is actually sent.
 */
class RelayBoard4ChannelDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();

    const { subDeviceId } = this.getData();
    this._subDeviceId = subDeviceId || 'main';
    this.log('Device data:', this._subDeviceId);

    const options = { endpoint: 1 };
    switch (subDeviceId) {
      case 'secondSwitch':
        options.endpoint = 2;
        break;
      case 'thirdSwitch':
        options.endpoint = 3;
        break;
      case 'fourthSwitch':
        options.endpoint = 4;
        break;
      default:
        options.endpoint = 1;
        break;
    }

    this.registerCapability('onoff', CLUSTER.ON_OFF, options);

    // Drop legacy phantom button capability if still present on paired devices
    if (this.hasCapability('button.1')) {
      await this.removeCapability('button.1').catch(() => {});
    }

    await zclNode.endpoints[1]?.clusters?.basic
      ?.readAttributes([
        'manufacturerName',
        'zclVersion',
        'appVersion',
        'modelId',
        'powerSource',
        'attributeReportingStatus',
      ])
      .catch((err) => {
        this.error('Error when reading device attributes', err);
      });
  }

  onDeleted() {
    this.log('4 Channel Relay Board, channel', this._subDeviceId || 'unknown', 'removed');
    if (typeof super.onDeleted === 'function') super.onDeleted();
  }
}

module.exports = RelayBoard4ChannelDevice;
