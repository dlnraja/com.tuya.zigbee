'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class FloorDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 floor Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = FloorDriver;