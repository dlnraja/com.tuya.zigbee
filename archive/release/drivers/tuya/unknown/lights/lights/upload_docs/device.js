#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class Upload_docsDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('upload_docs device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\command\upload_docs.py'); this.log('Original file: upload_docs.py'); // Register capabilities } }module.exports = Upload_docsDevice;