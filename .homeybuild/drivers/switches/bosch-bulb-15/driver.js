'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class boschBulb_15Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('bosch-bulb-15 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = boschBulb_15Driver;
