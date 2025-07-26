const { Device } = require('homey');
'use strict'; const { ZigBeeDriver } = require('homey-meshdriver'); class radiatorvalveDriver extends ZigBeeDriver { async onMeshInit() { this.log('radiatorvalveDriver has been initialized'); } } module.exports = radiatorvalveDriver; 

