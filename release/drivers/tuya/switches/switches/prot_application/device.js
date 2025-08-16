#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class Prot_applicationDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('prot_application device initialized'); this.log('Source: D:\Download\Compressed\katana\PortableApps\FirefoxPortable\App\Firefox\components\nsSafebrowsingApplication.js'); this.log('Original file: nsSafebrowsingApplication.js'); // Register capabilities } }module.exports = Prot_applicationDevice;