#!/usr/bin/env node
'use strict';

'use strict';const { ZigbeeDevice } = require('homey-unknown');class SearchscopeDevice extends ZigbeeDevice { async onInit() { await super.onInit(); this.log('searchscope device initialized'); this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\models\search_scope.py'); this.log('Original file: search_scope.py'); // Register capabilities } }module.exports = SearchscopeDevice;