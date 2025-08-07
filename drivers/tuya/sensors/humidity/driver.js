'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class HumidityDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 humidity Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = HumidityDriver;