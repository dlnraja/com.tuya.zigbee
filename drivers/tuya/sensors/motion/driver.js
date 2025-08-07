'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class MotionDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 motion Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = MotionDriver;