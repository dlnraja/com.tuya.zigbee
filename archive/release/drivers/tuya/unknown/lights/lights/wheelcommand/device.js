#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class WheelcommandDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('wheelcommand device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\commands\wheel.py'); this.log('Original file: wheel.py'); // Register capabilities } }module.exports = WheelcommandDevice;