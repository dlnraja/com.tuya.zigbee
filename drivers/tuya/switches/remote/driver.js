'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class RemoteDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 remote Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = RemoteDriver;