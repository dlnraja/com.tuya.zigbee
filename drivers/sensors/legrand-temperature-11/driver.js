'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class legrandTemperature_11Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('legrand-temperature-11 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = legrandTemperature_11Driver;
