'use strict'; const { ZigBeeDevice } = require('homey-meshdriver'); class powerstripDevice extends ZigBeeDevice { async onNodeInit({ zclNode }) { 
