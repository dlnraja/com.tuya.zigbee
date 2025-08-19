#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class TraversableresourcesloaderDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('traversableresourcesloader device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_vendor\importlib_resources\_compat.py'); this.log('Original file: _compat.py'); // Register capabilities } }module.exports = TraversableresourcesloaderDevice;