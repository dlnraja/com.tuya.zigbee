'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');
const { CLUSTER } = require('zigbee-clusters');

class LightsDevice extends ZigbeeDevice {
    async onMeshInit() {
        this.log('🚀 LIGHTS DEVICE INITIALIZED - MEGA ULTIMATE MODE');
        this.registerCapability('onoff', CLUSTER.GEN_BASIC);
        this.registerCapability('dim', CLUSTER.GEN_BASIC);
        this.log('✅ Lights device initialized successfully - MEGA ULTIMATE');
    }
}

module.exports = LightsDevice;
