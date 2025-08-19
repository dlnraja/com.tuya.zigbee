#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class Dist_infoDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('dist_info device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\command\dist_info.py'); this.log('Original file: dist_info.py'); // Register capabilities } }module.exports = Dist_infoDevice;