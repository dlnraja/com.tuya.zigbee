'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class innrTemperature_8Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('innr-temperature-8 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = innrTemperature_8Driver;
