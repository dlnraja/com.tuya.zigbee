'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class ledvanceBulb_11Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('ledvance-bulb-11 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = ledvanceBulb_11Driver;
