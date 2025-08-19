#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class Doorwindowsensor_4Device extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('doorwindowsensor_4 device initialized'); this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\drivers\doorwindowsensor_4\device.js'); this.log('Original file: device.js'); // Register capabilities } }module.exports = Doorwindowsensor_4Device;