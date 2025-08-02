'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class sylvaniaSwitch_7Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('sylvania-switch-7 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = sylvaniaSwitch_7Driver;
