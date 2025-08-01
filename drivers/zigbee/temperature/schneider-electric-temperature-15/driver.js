'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class schneiderElectricTemperature_15Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('schneider-electric-temperature-15 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = schneiderElectricTemperature_15Driver;
