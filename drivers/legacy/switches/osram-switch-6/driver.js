'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class osramSwitch_6Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('osram-switch-6 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = osramSwitch_6Driver;
