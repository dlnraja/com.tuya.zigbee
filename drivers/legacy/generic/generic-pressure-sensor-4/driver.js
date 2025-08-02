'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class genericPressureSensor_4Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('generic-pressure-sensor-4 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = genericPressureSensor_4Driver;
