#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class IaszoneclusterDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('iaszonecluster device initialized'); this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\iasZone.js'); this.log('Original file: iasZone.js'); // Register capabilities } }module.exports = IaszoneclusterDevice;