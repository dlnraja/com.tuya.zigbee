#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class ToDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('to device initialized'); this.log('Source: D:\Download\Compressed\CP210x_Universal_Windows_Driver\CP210x_Universal_Windows_Driver_ReleaseNotes.txt'); this.log('Original file: CP210x_Universal_Windows_Driver_ReleaseNotes.txt'); // Register capabilities } }module.exports = ToDevice;