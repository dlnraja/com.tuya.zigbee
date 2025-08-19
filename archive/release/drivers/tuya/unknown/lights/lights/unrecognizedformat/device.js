#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class UnrecognizedformatDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('unrecognizedformat device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\archive_util.py'); this.log('Original file: archive_util.py'); // Register capabilities } }module.exports = UnrecognizedformatDevice;