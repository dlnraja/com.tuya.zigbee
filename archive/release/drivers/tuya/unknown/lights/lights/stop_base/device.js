#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class Stop_baseDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('stop_base device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\tenacity\stop.py'); this.log('Original file: stop.py'); // Register capabilities } }module.exports = Stop_baseDevice;