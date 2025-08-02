'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class philipsHueMotion_9Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('philips-hue-motion-9 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = philipsHueMotion_9Driver;
