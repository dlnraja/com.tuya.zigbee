#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class AliasDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('alias device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\command\alias.py'); this.log('Original file: alias.py'); // Register capabilities } }module.exports = AliasDevice;