'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class TS0044Device extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 TS0044 - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = TS0044Device;