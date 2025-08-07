'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class OutdoorDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 outdoor Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = OutdoorDriver;