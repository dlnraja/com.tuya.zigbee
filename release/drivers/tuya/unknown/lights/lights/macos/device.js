#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class MacosDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('macos device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\platformdirs\macos.py'); this.log('Original file: macos.py'); // Register capabilities } }module.exports = MacosDevice;