#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class BinaryvalueclusterDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('binaryvaluecluster device initialized'); this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\binaryValue.js'); this.log('Original file: binaryValue.js'); // Register capabilities } }module.exports = BinaryvalueclusterDevice;