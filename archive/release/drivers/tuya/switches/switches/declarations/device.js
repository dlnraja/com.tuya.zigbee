#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class DeclarationsDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('declarations device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Scripts\Activate.js'); this.log('Original file: Activate.js'); // Register capabilities } }module.exports = DeclarationsDevice;