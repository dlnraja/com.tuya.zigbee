#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class NormalizesDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('normalizes device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\urllib3\__pycache__\poolmanager.cpython-311.pyc'); this.log('Original file: poolmanager.cpython-311.pyc'); // Register capabilities } }module.exports = NormalizesDevice;