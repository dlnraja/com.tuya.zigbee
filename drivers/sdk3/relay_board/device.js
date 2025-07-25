'use strict'; const { ZigBeeDevice } = require('homey-meshdriver'); class relayboardDevice extends ZigBeeDevice { async onNodeInit({ zclNode }) { 
