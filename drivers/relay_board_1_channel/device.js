'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const Homey = require('homey');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { debug, CLUSTER } = require('zigbee-clusters');

class relay_board_1_channel extends TuyaZigbeeDevice {

    async onNodeInit({zclNode}) {
    await super.onNodeInit({ zclNode }).catch(() => {});

        this.printNode();

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        const options = {};

        switch (subDeviceId){
            default:
                options.endpoint = 1;
                break;
        }

        this.registerCapability('onoff', CLUSTER.ON_OFF, options);

        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });

    }

    onDeleted(){
      const { subDeviceId = 'default' } = this.getData();
      super.onDeleted();
      this.log('1 Channel Relay Board, channel', subDeviceId, 'removed');
    }

}

module.exports = relay_board_1_channel;
return module.exports;
});
