'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class genericTemperature_1Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('generic-temperature-1 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = genericTemperature_1Driver;
