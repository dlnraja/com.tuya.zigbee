#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class RedirecthandlerDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('redirecthandler device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\distlib\locators.py'); this.log('Original file: locators.py'); // Register capabilities } }module.exports = RedirecthandlerDevice;