#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class NameDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('name device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\config\_validate_pyproject\fastjsonschema_validations.py'); this.log('Original file: fastjsonschema_validations.py'); // Register capabilities } }module.exports = NameDevice;