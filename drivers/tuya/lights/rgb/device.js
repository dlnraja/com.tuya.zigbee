'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class RgbDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 rgb - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = RgbDevice;