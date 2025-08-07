'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class Thermostats_tuya_tuyaDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 thermostats_tuya_tuya Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = Thermostats_tuya_tuyaDriver;