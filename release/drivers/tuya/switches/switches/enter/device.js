#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class EnterDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('enter device initialized'); this.log('Source: D:\Download\Compressed\win64_24.20.100.6286\Graphics\ocl_cpu_cpu_device64.dll'); this.log('Original file: ocl_cpu_cpu_device64.dll'); // Register capabilities } }module.exports = EnterDevice;