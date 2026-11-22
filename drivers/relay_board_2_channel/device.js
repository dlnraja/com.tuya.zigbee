'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const Homey = require('homey');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { debug, CLUSTER } = require('zigbee-clusters');

class relay_board_2_channel extends TuyaZigbeeDevice {

    async onNodeInit({zclNode}) {
    await super.onNodeInit({ zclNode }).catch(() => {});

        this.printNode();

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        const options = {};

        switch (subDeviceId){
            case 'secondSwitch':
                options.endpoint = 2;
                break;
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
      super.onDeleted();
		this.log("2 Channel Relay Board, channel ", (this.getData() || {}).subDeviceId, " removed") // P3065: was undefined -> ReferenceError in onDeleted
	}

}

module.exports = relay_board_2_channel;
return module.exports;
});
