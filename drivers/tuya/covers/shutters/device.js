'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class ShuttersDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 shutters - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = ShuttersDevice;