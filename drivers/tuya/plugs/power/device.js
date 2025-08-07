'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class PowerDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 power - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = PowerDevice;