const { Device } = require('homey');
'use strict'; const { ZigBeeDriver } = require('homey-meshdriver'); class smartplug2socketDriver extends ZigBeeDriver { async onMeshInit() { this.log('smartplug2socketDriver has been initialized'); } } module.exports = smartplug2socketDriver; 

