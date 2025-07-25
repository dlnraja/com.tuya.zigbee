'use strict'; const { ZigBeeDevice } = require('homey-meshdriver'); class pirsensorDevice extends ZigBeeDevice { async onNodeInit({ zclNode }) { 
