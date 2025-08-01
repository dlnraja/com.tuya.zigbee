'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class genericSwitch_1Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('generic-switch-1 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = genericSwitch_1Driver;
