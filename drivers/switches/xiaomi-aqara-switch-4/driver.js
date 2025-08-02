'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class xiaomiAqaraSwitch_4Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('xiaomi-aqara-switch-4 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = xiaomiAqaraSwitch_4Driver;
