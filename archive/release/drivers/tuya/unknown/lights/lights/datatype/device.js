#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class DatatypeDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('datatype device initialized'); this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\@athombv\data-types\lib\DataType.js'); this.log('Original file: DataType.js'); // Register capabilities } }module.exports = DatatypeDevice;