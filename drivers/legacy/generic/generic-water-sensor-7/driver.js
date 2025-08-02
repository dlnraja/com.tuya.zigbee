'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class genericWaterSensor_7Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('generic-water-sensor-7 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = genericWaterSensor_7Driver;
