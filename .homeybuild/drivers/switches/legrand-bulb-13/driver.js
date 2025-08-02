'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class legrandBulb_13Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('legrand-bulb-13 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = legrandBulb_13Driver;
