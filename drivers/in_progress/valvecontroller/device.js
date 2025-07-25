try {
'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-meshdriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class valvecontroller extends ZigbeeDevice {

    async 
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION);

        this.printNode();

        this.registerCapability('onoff', CLUSTER.ON_OFF);

        await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
        .catch(err => {
            this.error('Error when reading device attributes ', err);
        });

    }

    onDeleted(){
		this.log("Valve Controller removed")
	}

}

module.exports = valvecontroller;

} catch(e) { this.error('Driver error', e); }


