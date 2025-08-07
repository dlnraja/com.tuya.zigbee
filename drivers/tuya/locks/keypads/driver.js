'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class KeypadsDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 keypads Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = KeypadsDriver;