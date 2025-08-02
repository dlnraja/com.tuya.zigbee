'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class sylvaniaTemperature_7Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('sylvania-temperature-7 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = sylvaniaTemperature_7Driver;
