#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class RatherDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('rather device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\idna\__pycache__\core.cpython-311.pyc'); this.log('Original file: core.cpython-311.pyc'); // Register capabilities } }module.exports = RatherDevice;