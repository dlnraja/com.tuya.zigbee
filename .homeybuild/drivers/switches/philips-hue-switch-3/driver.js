'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class philipsHueSwitch_3Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('philips-hue-switch-3 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = philipsHueSwitch_3Driver;
