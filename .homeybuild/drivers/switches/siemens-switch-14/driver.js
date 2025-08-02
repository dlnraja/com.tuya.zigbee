'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class siemensSwitch_14Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('siemens-switch-14 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = siemensSwitch_14Driver;
