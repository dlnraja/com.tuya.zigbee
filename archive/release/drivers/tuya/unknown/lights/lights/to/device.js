#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class ToDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('to device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\urllib3\__pycache__\fields.cpython-311.pyc'); this.log('Original file: fields.cpython-311.pyc'); // Register capabilities } }module.exports = ToDevice;