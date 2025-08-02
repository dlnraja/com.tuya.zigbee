'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class innrBulb_10Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('innr-bulb-10 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = innrBulb_10Driver;
