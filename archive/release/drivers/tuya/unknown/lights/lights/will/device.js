#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class WillDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('will device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\__pycache__\monkey.cpython-311.pyc'); this.log('Original file: monkey.cpython-311.pyc'); // Register capabilities } }module.exports = WillDevice;