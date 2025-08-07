'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class PowerDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 power Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = PowerDriver;