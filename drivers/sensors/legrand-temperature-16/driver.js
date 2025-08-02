'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class legrandTemperature_16Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('legrand-temperature-16 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = legrandTemperature_16Driver;
