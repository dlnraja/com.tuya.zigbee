'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class Zigbee-sensor-unknownDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 zigbee-sensor-unknown Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = Zigbee-sensor-unknownDriver;