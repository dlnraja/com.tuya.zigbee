'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class SmartDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 smart - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = SmartDevice;