'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class Plugs_tuya_plugsDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('🚀 plugs_tuya_plugs Driver - Initialisation...');
        // Configuration du driver
    }
}

module.exports = Plugs_tuya_plugsDriver;