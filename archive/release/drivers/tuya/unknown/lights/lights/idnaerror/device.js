#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class IdnaerrorDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('idnaerror device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\idna\core.py'); this.log('Original file: core.py'); // Register capabilities } }module.exports = IdnaerrorDevice;