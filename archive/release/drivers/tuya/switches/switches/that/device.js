#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class ThatDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('that device initialized'); this.log('Source: D:\Download\WSA_2407.40000.4.0_x64\wsldevicehost.dll'); this.log('Original file: wsldevicehost.dll'); // Register capabilities } }module.exports = ThatDevice;