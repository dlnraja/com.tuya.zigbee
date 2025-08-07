'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class KeypadsDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 keypads - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = KeypadsDevice;