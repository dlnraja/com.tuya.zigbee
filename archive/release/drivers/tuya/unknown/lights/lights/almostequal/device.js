#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class AlmostequalDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('almostequal device initialized'); this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\almost-equal\almost_equal.js'); this.log('Original file: almost_equal.js'); // Register capabilities } }module.exports = AlmostequalDevice;