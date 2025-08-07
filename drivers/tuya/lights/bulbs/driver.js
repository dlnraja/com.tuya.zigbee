'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class BulbsDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 bulbs Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = BulbsDriver;