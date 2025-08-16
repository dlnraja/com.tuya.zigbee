#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class RdocDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('rdoc device initialized'); this.log('Source: D:\Download\Compressed\katana\PortableApps\Metasploit\Metasploit\lib\ruby\1.9.1\rdoc\ri\driver.rb'); this.log('Original file: driver.rb'); // Register capabilities } }module.exports = RdocDevice;