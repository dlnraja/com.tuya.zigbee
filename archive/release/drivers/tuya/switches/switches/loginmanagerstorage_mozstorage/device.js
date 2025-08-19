#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class Loginmanagerstorage_mozstorageDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('loginmanagerstorage_mozstorage device initialized'); this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\storage-mozStorage.js'); this.log('Original file: storage-mozStorage.js'); // Register capabilities } }module.exports = Loginmanagerstorage_mozstorageDevice;