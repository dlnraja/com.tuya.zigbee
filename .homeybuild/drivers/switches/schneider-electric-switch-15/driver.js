'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class schneiderElectricSwitch_15Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('schneider-electric-switch-15 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = schneiderElectricSwitch_15Driver;
