'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class HumidityDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 humidity - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = HumidityDevice;