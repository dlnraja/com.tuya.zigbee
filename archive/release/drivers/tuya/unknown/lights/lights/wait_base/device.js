#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class Wait_baseDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('wait_base device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\tenacity\wait.py'); this.log('Original file: wait.py'); // Register capabilities } }module.exports = Wait_baseDevice;