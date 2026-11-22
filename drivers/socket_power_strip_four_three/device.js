'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const Homey = require('homey');
const { debug, CLUSTER } = require('zigbee-clusters');

class socket_power_strip_four_three extends TuyaZigbeeDevice {
		
	async onNodeInit({zclNode}) {

		this.printNode();

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        this.registerCapability('onoff', CLUSTER.ON_OFF, {
            endpoint: subDeviceId === 'socket2' ? 2 : subDeviceId === 'socket3' ? 3 : subDeviceId === 'socket4' ? 4 : 1,
        });

        if (!this.isSubDevice()) {
            await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
            .catch(err => {
                this.error('Error when reading device attributes ', err);
            });
        }

  }

	onDeleted(){
	  super.onDeleted();
		this.log("Power Strip removed")
	}

}

module.exports = socket_power_strip_four_three;
return module.exports;
});
