'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class Generic-unknownDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 generic-unknown Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = Generic-unknownDriver;