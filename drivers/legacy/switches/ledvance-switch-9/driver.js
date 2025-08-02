'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class ledvanceSwitch_9Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('ledvance-switch-9 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = ledvanceSwitch_9Driver;
