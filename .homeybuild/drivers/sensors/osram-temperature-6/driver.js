'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class osramTemperature_6Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('osram-temperature-6 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = osramTemperature_6Driver;
