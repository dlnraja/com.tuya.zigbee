#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class FlowmeasurementclusterDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('flowmeasurementcluster device initialized'); this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\flowMeasurement.js'); this.log('Original file: flowMeasurement.js'); // Register capabilities } }module.exports = FlowmeasurementclusterDevice;