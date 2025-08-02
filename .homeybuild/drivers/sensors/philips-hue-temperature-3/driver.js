'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class philipsHueTemperature_3Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('philips-hue-temperature-3 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = philipsHueTemperature_3Driver;
