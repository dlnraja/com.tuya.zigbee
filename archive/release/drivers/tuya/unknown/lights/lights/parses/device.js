#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class ParsesDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('parses device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\models\__pycache__\link.cpython-311.pyc'); this.log('Original file: link.cpython-311.pyc'); // Register capabilities } }module.exports = ParsesDevice;