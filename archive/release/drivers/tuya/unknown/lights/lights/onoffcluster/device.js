#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class OnoffclusterDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('onoffcluster device initialized'); this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\onOff.js'); this.log('Original file: onOff.js'); // Register capabilities } }module.exports = OnoffclusterDevice;