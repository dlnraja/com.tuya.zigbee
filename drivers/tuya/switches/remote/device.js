'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class RemoteDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 remote - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = RemoteDevice;