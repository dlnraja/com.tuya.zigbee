'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class WallDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 wall Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = WallDriver;