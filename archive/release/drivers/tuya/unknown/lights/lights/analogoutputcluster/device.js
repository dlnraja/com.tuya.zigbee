#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class AnalogoutputclusterDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('analogoutputcluster device initialized'); this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\analogOutput.js'); this.log('Original file: analogOutput.js'); // Register capabilities } }module.exports = AnalogoutputclusterDevice;