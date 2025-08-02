'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class genericGasSensor_5Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('generic-gas-sensor-5 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = genericGasSensor_5Driver;
