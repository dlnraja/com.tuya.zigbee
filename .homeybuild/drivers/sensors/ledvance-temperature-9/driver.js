'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class ledvanceTemperature_9Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('ledvance-temperature-9 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = ledvanceTemperature_9Driver;
