'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class ikeaTradfriTemperature_2Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('ikea-tradfri-temperature-2 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = ikeaTradfriTemperature_2Driver;
