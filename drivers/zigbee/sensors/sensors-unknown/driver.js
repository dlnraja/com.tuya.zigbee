'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class Sensors-unknownDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 sensors-unknown Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = Sensors-unknownDriver;