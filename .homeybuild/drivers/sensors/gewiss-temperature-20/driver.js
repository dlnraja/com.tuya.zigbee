'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class gewissTemperature_20Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('gewiss-temperature-20 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = gewissTemperature_20Driver;
