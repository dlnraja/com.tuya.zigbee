'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const Homey = require('homey');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { debug, CLUSTER } = require('zigbee-clusters');

class valvecontroller extends TuyaZigbeeDevice {

    async onNodeInit({zclNode}) {
    await super.onNodeInit({ zclNode }).catch(() => {});

        this.printNode();

        this.registerCapability('onoff', CLUSTER.ON_OFF);

        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });

    }

    onDeleted(){
      super.onDeleted();
		this.log("Valve Controller removed")
	}

}

module.exports = valvecontroller;
return module.exports;
});
