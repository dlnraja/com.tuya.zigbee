'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class switch4gangDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('switch4gangDriver has been initialized');
    }
}

module.exports = switch4gangDriver;
