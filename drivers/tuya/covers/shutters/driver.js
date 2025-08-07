'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class ShuttersDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 shutters Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = ShuttersDriver;