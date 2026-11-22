'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const { debug, CLUSTER } = require('zigbee-clusters');

class dimmer_2_gang extends UnifiedSwitchBase {

    async onNodeInit({zclNode}) {

        this.printNode();

        const { subDeviceId } = this.getData();
        this.log("Device data: ", subDeviceId);

        this.registerCapability('onoff', CLUSTER.ON_OFF, {
            endpoint: subDeviceId === 'secondDimmer' ? 2 : 1,
        });

        this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, {
            endpoint: subDeviceId === 'secondDimmer' ? 2 : 1,
        });

        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });

    }

    onDeleted(){
      super.onDeleted();
		this.log("2 Gang Dimmer removed")
	}

}

module.exports = dimmer_2_gang;
return module.exports;
});
