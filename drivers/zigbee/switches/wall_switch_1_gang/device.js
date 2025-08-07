'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class Wall_switch_1_gangDevice extends ZigBeeDevice {
    async onMeshInit() {
        this.log('🚀 wall_switch_1_gang - Initialisation...');
        // Configuration spécifique au driver
    }
}

module.exports = Wall_switch_1_gangDevice;