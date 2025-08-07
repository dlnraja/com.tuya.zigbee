'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class DimmersDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 dimmers - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = DimmersDevice;