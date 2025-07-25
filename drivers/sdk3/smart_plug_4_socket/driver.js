'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class smartplug4socketDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('smartplug4socketDriver has been initialized');
    }
}

module.exports = smartplug4socketDriver;
