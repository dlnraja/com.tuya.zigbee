#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class WinregDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('winreg device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\msvc.py'); this.log('Original file: msvc.py'); // Register capabilities } }module.exports = WinregDevice;