'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class WaterDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 water Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = WaterDriver;