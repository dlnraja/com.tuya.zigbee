#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class UninstallcommandDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('uninstallcommand device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\commands\uninstall.py'); this.log('Original file: uninstall.py'); // Register capabilities } }module.exports = UninstallcommandDevice;