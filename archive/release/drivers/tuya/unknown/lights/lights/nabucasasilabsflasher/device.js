#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class NabucasasilabsflasherDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('nabucasasilabsflasher device initialized'); this.log('Source: D:\Download\Compressed\sl-web-tools-dev\sl-web-tools-dev\src\nabucasa-zigbee-flasher.ts'); this.log('Original file: nabucasa-zigbee-flasher.ts'); // Register capabilities } }module.exports = NabucasasilabsflasherDevice;