'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class SwitchesDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 switches Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = SwitchesDriver;