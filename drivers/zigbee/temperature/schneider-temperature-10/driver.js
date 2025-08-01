'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class schneiderTemperature_10Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('schneider-temperature-10 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = schneiderTemperature_10Driver;
