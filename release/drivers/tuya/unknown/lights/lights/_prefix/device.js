#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class _prefixDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('_prefix device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\build_env.py'); this.log('Original file: build_env.py'); // Register capabilities } }module.exports = _prefixDevice;