'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class xiaomiAqaraTemperature_4Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('xiaomi-aqara-temperature-4 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = xiaomiAqaraTemperature_4Driver;
