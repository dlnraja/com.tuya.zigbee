﻿const { Device } = require('homey');
'use strict'; const { ZigBeeDriver } = require('homey-meshdriver'); class doorwindowsensorDriver extends ZigBeeDriver { async onMeshInit() { this.log('doorwindowsensorDriver has been initialized'); } } module.exports = doorwindowsensorDriver; 

