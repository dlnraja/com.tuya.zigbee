'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class BlindsDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 blinds Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = BlindsDriver;