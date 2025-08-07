'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class BulbsDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 bulbs - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = BulbsDevice;