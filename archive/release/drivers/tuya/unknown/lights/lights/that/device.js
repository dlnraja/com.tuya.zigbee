#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class ThatDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('that device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\requests\__pycache__\auth.cpython-311.pyc'); this.log('Original file: auth.cpython-311.pyc'); // Register capabilities } }module.exports = ThatDevice;