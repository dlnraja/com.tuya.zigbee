#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class OnlyDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('only device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\distlib\__pycache__\database.cpython-311.pyc'); this.log('Original file: database.cpython-311.pyc'); // Register capabilities } }module.exports = OnlyDevice;