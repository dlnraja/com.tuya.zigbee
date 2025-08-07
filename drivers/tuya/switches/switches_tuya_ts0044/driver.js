'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class Switches_tuya_ts0044Driver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 switches_tuya_ts0044 Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = Switches_tuya_ts0044Driver;