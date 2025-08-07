'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class Sensors_tuya_curtainsDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 sensors_tuya_curtains Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = Sensors_tuya_curtainsDriver;