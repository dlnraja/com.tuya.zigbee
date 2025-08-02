'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class sylvaniaBulb_9Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('sylvania-bulb-9 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = sylvaniaBulb_9Driver;
