'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class IndoorDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 indoor - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = IndoorDevice;