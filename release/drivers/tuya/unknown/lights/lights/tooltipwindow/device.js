#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class TooltipwindowDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('tooltipwindow device initialized'); this.log('Source: D:\Download\Compressed\katana\PortableApps\Metasploit\Metasploit\msf3\data\msfweb\public\javascripts\tooltip.js'); this.log('Original file: tooltip.js'); // Register capabilities } }module.exports = TooltipwindowDevice;