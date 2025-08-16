#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class OfDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('of device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_distutils\cygwinccompiler.py'); this.log('Original file: cygwinccompiler.py'); // Register capabilities } }module.exports = OfDevice;