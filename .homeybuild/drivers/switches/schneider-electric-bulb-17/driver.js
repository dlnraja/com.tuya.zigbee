'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class schneiderElectricBulb_17Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('schneider-electric-bulb-17 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = schneiderElectricBulb_17Driver;
