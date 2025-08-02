'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class schneiderBulb_12Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('schneider-bulb-12 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = schneiderBulb_12Driver;
