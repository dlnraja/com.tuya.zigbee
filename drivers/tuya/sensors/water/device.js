'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class WaterDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 water - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = WaterDevice;