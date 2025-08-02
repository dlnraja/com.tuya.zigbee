'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class sylvaniaMotion_13Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('sylvania-motion-13 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = sylvaniaMotion_13Driver;
