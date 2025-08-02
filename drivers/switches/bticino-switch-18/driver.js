'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class bticinoSwitch_18Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('bticino-switch-18 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = bticinoSwitch_18Driver;
