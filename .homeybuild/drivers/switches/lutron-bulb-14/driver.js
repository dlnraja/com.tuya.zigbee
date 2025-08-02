'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class lutronBulb_14Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('lutron-bulb-14 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = lutronBulb_14Driver;
