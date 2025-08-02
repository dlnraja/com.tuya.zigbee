'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class siemensMotion_20Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('siemens-motion-20 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = siemensMotion_20Driver;
