#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class ThermostaticradiatorvalveDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('thermostaticradiatorvalve device initialized'); this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\drivers\thermostatic_radiator_valve\device.js'); this.log('Original file: device.js'); // Register capabilities } }module.exports = ThermostaticradiatorvalveDevice;