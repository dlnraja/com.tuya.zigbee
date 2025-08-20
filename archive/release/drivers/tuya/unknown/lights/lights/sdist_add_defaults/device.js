#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class Sdist_add_defaultsDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('sdist_add_defaults device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\command\py36compat.py'); this.log('Original file: py36compat.py'); // Register capabilities } }module.exports = Sdist_add_defaultsDevice;