'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class genericHumiditySensor_3Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('generic-humidity-sensor-3 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = genericHumiditySensor_3Driver;
