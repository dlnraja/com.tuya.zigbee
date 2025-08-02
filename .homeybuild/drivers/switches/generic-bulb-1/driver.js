'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class genericBulb_1Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('generic-bulb-1 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = genericBulb_1Driver;
