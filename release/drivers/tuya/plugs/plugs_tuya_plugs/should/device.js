#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class ShouldDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('should device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pkg_resources\__pycache__\__init__.cpython-311.pyc'); this.log('Original file: __init__.cpython-311.pyc'); // Register capabilities } }module.exports = ShouldDevice;