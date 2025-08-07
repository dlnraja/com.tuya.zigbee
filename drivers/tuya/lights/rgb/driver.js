'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class RgbDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 rgb Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = RgbDriver;