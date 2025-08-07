'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class CurtainsDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 curtains Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = CurtainsDriver;