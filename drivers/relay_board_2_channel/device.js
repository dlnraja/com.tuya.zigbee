'use strict';

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
		this.log("2 Channel Relay Board, channel ", subDeviceId, " removed")
	}

}

module.exports = relay_board_2_channel;