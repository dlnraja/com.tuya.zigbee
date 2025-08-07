'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class DimmersDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 dimmers Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = DimmersDriver;