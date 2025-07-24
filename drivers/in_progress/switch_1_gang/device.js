try {
'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-meshdriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class switch_1_gang extends ZigbeeDevice {

    async 
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION);

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
		this.log("1 Gang Switch removed")
	}

}

module.exports = switch_1_gang;

} catch(e) { this.error('Driver error', e); }

