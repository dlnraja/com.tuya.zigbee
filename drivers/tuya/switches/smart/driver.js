'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class SmartDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 smart Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = SmartDriver;