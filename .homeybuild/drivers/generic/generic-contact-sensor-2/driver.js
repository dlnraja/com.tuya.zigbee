'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class genericContactSensor_2Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('generic-contact-sensor-2 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = genericContactSensor_2Driver;
