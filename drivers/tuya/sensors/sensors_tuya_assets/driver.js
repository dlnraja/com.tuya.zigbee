'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class Sensors_tuya_assetsDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 sensors_tuya_assets Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = Sensors_tuya_assetsDriver;