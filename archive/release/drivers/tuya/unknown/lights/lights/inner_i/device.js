#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class Inner_iDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('inner_i device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\command\egg_info.py'); this.log('Original file: egg_info.py'); // Register capabilities } }module.exports = Inner_iDevice;