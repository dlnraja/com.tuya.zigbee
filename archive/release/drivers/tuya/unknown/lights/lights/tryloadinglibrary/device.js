#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class TryloadinglibraryDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('tryloadinglibrary device initialized'); this.log('Source: D:\Download\Compressed\katana\PortableApps\OpenOfficePortable\App\openoffice\Basis\share\Scripts\javascript\Highlight\ShowDialog.js'); this.log('Original file: ShowDialog.js'); // Register capabilities } }module.exports = TryloadinglibraryDevice;