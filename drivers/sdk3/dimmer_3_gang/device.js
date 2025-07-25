'use strict'; const { ZigBeeDevice } = require('homey-meshdriver'); class dimmer3gangDevice extends ZigBeeDevice { async onNodeInit({ zclNode }) { 
