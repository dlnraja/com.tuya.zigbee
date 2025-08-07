'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class Zigbee-sensorDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 zigbee-sensor Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = Zigbee-sensorDriver;