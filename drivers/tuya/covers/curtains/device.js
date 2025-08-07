'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class CurtainsDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 curtains - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = CurtainsDevice;