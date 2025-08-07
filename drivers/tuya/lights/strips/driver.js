'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class StripsDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 strips Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = StripsDriver;