'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class osramBulb_8Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('osram-bulb-8 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = osramBulb_8Driver;
