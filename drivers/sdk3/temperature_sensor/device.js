'use strict'; const { ZigBeeDevice } = require('homey-meshdriver'); class temperaturesensorDevice extends ZigBeeDevice { async onNodeInit({ zclNode }) { 
