'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class lutronTemperature_12Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('lutron-temperature-12 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = lutronTemperature_12Driver;
