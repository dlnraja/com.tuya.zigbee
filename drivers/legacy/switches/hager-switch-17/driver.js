'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class hagerSwitch_17Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('hager-switch-17 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = hagerSwitch_17Driver;
