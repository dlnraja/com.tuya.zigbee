'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class samsungSmartthingsMotion_11Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('samsung-smartthings-motion-11 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = samsungSmartthingsMotion_11Driver;
