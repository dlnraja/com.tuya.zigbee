'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class xiaomiAqaraBulb_6Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('xiaomi-aqara-bulb-6 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = xiaomiAqaraBulb_6Driver;
