'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class philipsHueBulb_5Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('philips-hue-bulb-5 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = philipsHueBulb_5Driver;
