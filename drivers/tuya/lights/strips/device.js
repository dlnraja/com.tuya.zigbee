'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class StripsDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 strips - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = StripsDevice;