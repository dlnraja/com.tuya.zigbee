#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class FixesDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('fixes device initialized'); this.log('Source: D:\Download\Compressed\x86_64-pc-windows-gnu\tool_config_files\build-repo-builds\plugins\VoodooPS2.json'); this.log('Original file: VoodooPS2.json'); // Register capabilities } }module.exports = FixesDevice;