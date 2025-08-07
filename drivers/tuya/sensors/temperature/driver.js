'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class TemperatureDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 temperature Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = TemperatureDriver;