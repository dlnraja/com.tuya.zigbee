#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class FromDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('from device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\urllib3\util\__pycache__\ssl_match_hostname.cpython-311.pyc'); this.log('Original file: ssl_match_hostname.cpython-311.pyc'); // Register capabilities } }module.exports = FromDevice;