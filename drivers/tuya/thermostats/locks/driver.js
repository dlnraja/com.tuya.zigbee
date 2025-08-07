'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class LocksDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 locks Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = LocksDriver;