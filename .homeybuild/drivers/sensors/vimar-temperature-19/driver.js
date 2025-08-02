'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class vimarTemperature_19Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('vimar-temperature-19 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = vimarTemperature_19Driver;
