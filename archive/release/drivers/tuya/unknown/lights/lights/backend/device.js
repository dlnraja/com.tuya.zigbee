#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class BackendDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('backend device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\metadata\__init__.py'); this.log('Original file: __init__.py'); // Register capabilities } }module.exports = BackendDevice;