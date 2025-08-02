'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class gewissSwitch_20Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('gewiss-switch-20 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = gewissSwitch_20Driver;
