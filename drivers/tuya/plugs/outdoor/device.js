'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class OutdoorDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 outdoor - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = OutdoorDevice;