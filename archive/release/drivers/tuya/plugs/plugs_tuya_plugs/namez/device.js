#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class NamezDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('namez device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\config\_validate_pyproject\__pycache__\fastjsonschema_validations.cpython-311.pyc'); this.log('Original file: fastjsonschema_validations.cpython-311.pyc'); // Register capabilities } }module.exports = NamezDevice;