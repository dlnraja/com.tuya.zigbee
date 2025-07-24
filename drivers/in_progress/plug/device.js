try {
'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class plug extends ZigbeeDevice {
		
	async 
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION);

    this.printNode();

    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      getOpts: {
        getOnStart: true,
        pollInterval: 15000,
				getOnOnline: true,
	    }
    });

    await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
    .catch(err => {
        this.error('Error when reading device attributes ', err);
    });

  }

	onDeleted(){
		this.log("Plug removed")
	}

}

module.exports = plug;

} catch(e) { this.error('Driver error', e); }

