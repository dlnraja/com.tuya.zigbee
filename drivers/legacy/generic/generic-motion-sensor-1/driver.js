'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class genericMotionSensor_1Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('generic-motion-sensor-1 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = genericMotionSensor_1Driver;
