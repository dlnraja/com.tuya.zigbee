#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class FailedDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('failed device initialized'); this.log('Source: D:\Download\Programs\Homey Pro USB Driver v1.0.0.exe'); this.log('Original file: Homey Pro USB Driver v1.0.0.exe'); // Register capabilities } }module.exports = FailedDevice;