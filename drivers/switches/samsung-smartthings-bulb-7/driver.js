'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class samsungSmartthingsBulb_7Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('samsung-smartthings-bulb-7 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = samsungSmartthingsBulb_7Driver;
