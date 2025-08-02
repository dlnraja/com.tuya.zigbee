'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class siemensTemperature_14Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('siemens-temperature-14 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = siemensTemperature_14Driver;
