const { Device } = require('homey');
'use strict'; const { ZigBeeDriver } = require('homey-meshdriver'); class temperaturesensorDriver extends ZigBeeDriver { async onMeshInit() { this.log('temperaturesensorDriver has been initialized'); } } module.exports = temperaturesensorDriver; 

