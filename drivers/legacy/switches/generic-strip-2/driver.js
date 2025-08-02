'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class genericStrip_2Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('generic-strip-2 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = genericStrip_2Driver;
