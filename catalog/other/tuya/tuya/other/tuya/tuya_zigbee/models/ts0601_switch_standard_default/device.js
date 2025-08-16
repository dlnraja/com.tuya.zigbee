#!/usr/bin/env node
'use strict';

'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');
class Device extends ZigBeeDevice{async onNodeInit(){this.log('init');}}
module.exports = Device;
