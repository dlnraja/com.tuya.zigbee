const { Device } = require('homey');
'use strict'; const { ZigBeeDriver } = require('homey-meshdriver'); class relayboardDriver extends ZigBeeDriver { async onMeshInit() { this.log('relayboardDriver has been initialized'); } } module.exports = relayboardDriver; 


