const { Device } = require('homey');
'use strict'; const { ZigBeeDriver } = require('homey-meshdriver'); class pirsensorDriver extends ZigBeeDriver { async onMeshInit() { this.log('pirsensorDriver has been initialized'); } } module.exports = pirsensorDriver; 

