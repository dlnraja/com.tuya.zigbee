#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class SetuptoolsdeprecationwarningDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('setuptoolsdeprecationwarning device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_deprecation_warning.py'); this.log('Original file: _deprecation_warning.py'); // Register capabilities } }module.exports = SetuptoolsdeprecationwarningDevice;