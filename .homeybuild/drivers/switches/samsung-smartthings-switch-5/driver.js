'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class samsungSmartthingsSwitch_5Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('samsung-smartthings-switch-5 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = samsungSmartthingsSwitch_5Driver;
