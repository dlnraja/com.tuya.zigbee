#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class PangomarkupformatterDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('pangomarkupformatter device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pygments\formatters\pangomarkup.py'); this.log('Original file: pangomarkup.py'); // Register capabilities } }module.exports = PangomarkupformatterDevice;