#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class Sleep_using_eventDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('sleep_using_event device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\tenacity\nap.py'); this.log('Original file: nap.py'); // Register capabilities } }module.exports = Sleep_using_eventDevice;