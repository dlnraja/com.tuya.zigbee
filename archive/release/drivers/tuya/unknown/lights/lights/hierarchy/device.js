#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class HierarchyDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('hierarchy device initialized'); this.log('Source: D:\Download\Programs\QDLoader+HS-USB+Driver_64bit_Setup.exe'); this.log('Original file: QDLoader+HS-USB+Driver_64bit_Setup.exe'); // Register capabilities } }module.exports = HierarchyDevice;