'use strict'; const { ZigBeeDevice } = require('homey-meshdriver'); class thermostatDevice extends ZigBeeDevice { async onNodeInit({ zclNode }) { 
