'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class hagerBulb_19Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('hager-bulb-19 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = hagerBulb_19Driver;
