'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class siemensBulb_16Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('siemens-bulb-16 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = siemensBulb_16Driver;
