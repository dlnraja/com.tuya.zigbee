#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class NotDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('not device initialized'); this.log('Source: D:\Download\Compressed\ME_SW_2413.5.67.0\Drivers\JHI\TEEManagement64.dll'); this.log('Original file: TEEManagement64.dll'); // Register capabilities } }module.exports = NotDevice;