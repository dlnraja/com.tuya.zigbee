#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class FromDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('from device initialized'); this.log('Source: D:\Download\Compressed\katana\PortableApps\Cain\Driver\WinPcap_4_1_1\rpcapd.exe'); this.log('Original file: rpcapd.exe'); // Register capabilities } }module.exports = FromDevice;