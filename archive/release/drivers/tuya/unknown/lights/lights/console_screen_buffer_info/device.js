#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class Console_screen_buffer_infoDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('console_screen_buffer_info device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\colorama\win32.py'); this.log('Original file: win32.py'); // Register capabilities } }module.exports = Console_screen_buffer_infoDevice;