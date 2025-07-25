'use strict'; const { ZigBeeDevice } = require('homey-meshdriver'); class humiditysensorDevice extends ZigBeeDevice { async onNodeInit({ zclNode }) { 
