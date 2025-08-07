'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class IndoorDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 indoor Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = IndoorDriver;