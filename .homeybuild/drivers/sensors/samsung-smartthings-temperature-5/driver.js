'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class samsungSmartthingsTemperature_5Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('samsung-smartthings-temperature-5 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = samsungSmartthingsTemperature_5Driver;
