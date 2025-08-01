'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class genericSmokeSensor_6Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('generic-smoke-sensor-6 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = genericSmokeSensor_6Driver;
