#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class Loginmanagerstorage_legacyDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('loginmanagerstorage_legacy device initialized'); this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\storage-Legacy.js'); this.log('Original file: storage-Legacy.js'); // Register capabilities } }module.exports = Loginmanagerstorage_legacyDevice;