#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class AlarmsclusterDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('alarmscluster device initialized'); this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\alarms.js'); this.log('Original file: alarms.js'); // Register capabilities } }module.exports = AlarmsclusterDevice;