#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class UnpackexceptionDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('unpackexception device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\msgpack\exceptions.py'); this.log('Original file: exceptions.py'); // Register capabilities } }module.exports = UnpackexceptionDevice;