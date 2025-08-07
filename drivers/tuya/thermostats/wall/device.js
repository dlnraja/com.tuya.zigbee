'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class WallDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 wall - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = WallDevice;