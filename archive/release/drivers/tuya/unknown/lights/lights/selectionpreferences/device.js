#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class SelectionpreferencesDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('selectionpreferences device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\models\selection_prefs.py'); this.log('Original file: selection_prefs.py'); // Register capabilities } }module.exports = SelectionpreferencesDevice;