#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class Cached_propertyDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('cached_property device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pyparsing\core.py'); this.log('Original file: core.py'); // Register capabilities } }module.exports = Cached_propertyDevice;