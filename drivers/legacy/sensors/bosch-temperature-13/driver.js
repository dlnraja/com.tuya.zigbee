'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class boschTemperature_13Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('bosch-temperature-13 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = boschTemperature_13Driver;
