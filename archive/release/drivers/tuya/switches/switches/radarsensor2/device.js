#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class Radarsensor2Device extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('radarsensor2 device initialized'); this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\drivers\radar_sensor_2\device.js'); this.log('Original file: device.js'); // Register capabilities } }module.exports = Radarsensor2Device;