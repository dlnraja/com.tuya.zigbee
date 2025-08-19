#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class Pyparsing_testDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('pyparsing_test device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pyparsing\testing.py'); this.log('Original file: testing.py'); // Register capabilities } }module.exports = Pyparsing_testDevice;