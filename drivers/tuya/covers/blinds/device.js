'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class BlindsDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 blinds - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = BlindsDevice;