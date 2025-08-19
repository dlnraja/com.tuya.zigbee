#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class WithinDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('within device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_distutils\__pycache__\errors.cpython-311.pyc'); this.log('Original file: errors.cpython-311.pyc'); // Register capabilities } }module.exports = WithinDevice;