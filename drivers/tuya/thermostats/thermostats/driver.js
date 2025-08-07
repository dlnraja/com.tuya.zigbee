'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class ThermostatsDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 thermostats Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = ThermostatsDriver;