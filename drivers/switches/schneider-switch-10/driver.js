'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class schneiderSwitch_10Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('schneider-switch-10 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = schneiderSwitch_10Driver;
