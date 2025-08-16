#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class JsonschemaexceptionDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('jsonschemaexception device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\config\_validate_pyproject\fastjsonschema_exceptions.py'); this.log('Original file: fastjsonschema_exceptions.py'); // Register capabilities } }module.exports = JsonschemaexceptionDevice;