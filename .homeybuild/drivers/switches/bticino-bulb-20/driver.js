'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class bticinoBulb_20Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('bticino-bulb-20 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = bticinoBulb_20Driver;
