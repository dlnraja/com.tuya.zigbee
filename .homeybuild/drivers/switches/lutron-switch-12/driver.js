'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class lutronSwitch_12Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('lutron-switch-12 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = lutronSwitch_12Driver;
