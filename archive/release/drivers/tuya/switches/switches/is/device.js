#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class IsDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('is device initialized'); this.log('Source: D:\Download\Compressed\CH314A Tools Collection ByNSC\AsProgrammer\drivers\AVRISPMK2\x86\libusb0_x86.dll'); this.log('Original file: libusb0_x86.dll'); // Register capabilities } }module.exports = IsDevice;