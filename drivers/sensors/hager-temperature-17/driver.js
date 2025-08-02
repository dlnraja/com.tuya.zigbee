'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class hagerTemperature_17Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('hager-temperature-17 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = hagerTemperature_17Driver;
