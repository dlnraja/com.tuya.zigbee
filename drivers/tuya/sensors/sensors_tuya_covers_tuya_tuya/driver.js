'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class Sensors_tuya_covers_tuya_tuyaDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 sensors_tuya_covers_tuya_tuya Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = Sensors_tuya_covers_tuya_tuyaDriver;