#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class NowinsecondsDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('nowinseconds device initialized'); this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\NetworkGeolocationProvider.js'); this.log('Original file: NetworkGeolocationProvider.js'); // Register capabilities } }module.exports = NowinsecondsDevice;