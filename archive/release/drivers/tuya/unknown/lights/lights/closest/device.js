#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class ClosestDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('closest device initialized'); this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\mumath\closest.js'); this.log('Original file: closest.js'); // Register capabilities } }module.exports = ClosestDevice;