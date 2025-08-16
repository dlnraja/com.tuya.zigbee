#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class UsedDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('used device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\resolution\resolvelib\__pycache__\resolver.cpython-311.pyc'); this.log('Original file: resolver.cpython-311.pyc'); // Register capabilities } }module.exports = UsedDevice;