#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class FromDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('from device initialized'); this.log('Source: D:\Download\Compressed\CP210x_Windows_Drivers_with_Serial_Enumeration\CP210xVCPInstaller_x86.exe'); this.log('Original file: CP210xVCPInstaller_x86.exe'); // Register capabilities } }module.exports = FromDevice;