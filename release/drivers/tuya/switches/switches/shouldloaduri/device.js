#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class ShouldloaduriDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('shouldloaduri device initialized'); this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\nsBrowserContentHandler.js'); this.log('Original file: nsBrowserContentHandler.js'); // Register capabilities } }module.exports = ShouldloaduriDevice;