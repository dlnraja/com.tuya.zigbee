'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class ledvanceMotion_15Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('ledvance-motion-15 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = ledvanceMotion_15Driver;
