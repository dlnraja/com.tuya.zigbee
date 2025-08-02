'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class bticinoTemperature_18Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('bticino-temperature-18 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = bticinoTemperature_18Driver;
