'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class FloorDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 floor - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = FloorDevice;