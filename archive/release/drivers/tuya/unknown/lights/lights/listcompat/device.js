#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class ListcompatDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('listcompat device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_distutils\command\bdist.py'); this.log('Original file: bdist.py'); // Register capabilities } }module.exports = ListcompatDevice;