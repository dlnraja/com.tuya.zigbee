#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class Rgb_spot_gardenlightDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('rgb_spot_gardenlight device initialized'); this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\drivers\rgb_spot_GardenLight\device.js'); this.log('Original file: device.js'); // Register capabilities } }module.exports = Rgb_spot_gardenlightDevice;