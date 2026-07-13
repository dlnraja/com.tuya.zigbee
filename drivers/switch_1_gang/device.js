const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const { debug, CLUSTER } = require('zigbee-clusters');

class switch_1_gang extends UnifiedSwitchBase {

    async onNodeInit({zclNode}) {

        this.printNode();
/*     debug(true);
    this.enableDebug(); */

        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });

        this.registerCapability('onoff', CLUSTER.ON_OFF);

    }

    onDeleted(){
      super.onDeleted();
		this.log("1 Gang Switch removed")
	}

}

module.exports = switch_1_gang;