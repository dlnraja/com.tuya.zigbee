'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class TemperatureDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 temperature - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = TemperatureDevice;