#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class EntrypointDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('entrypoint device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\metadata\pkg_resources.py'); this.log('Original file: pkg_resources.py'); // Register capabilities } }module.exports = EntrypointDevice;