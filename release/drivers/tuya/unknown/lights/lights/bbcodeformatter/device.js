#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class BbcodeformatterDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('bbcodeformatter device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pygments\formatters\bbcode.py'); this.log('Original file: bbcode.py'); // Register capabilities } }module.exports = BbcodeformatterDevice;