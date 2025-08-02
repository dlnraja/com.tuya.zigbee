'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class legrandBulb_18Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('legrand-bulb-18 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = legrandBulb_18Driver;
