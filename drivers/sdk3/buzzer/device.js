'use strict'; const { ZigBeeDevice } = require('homey-meshdriver'); class buzzerDevice extends ZigBeeDevice { async onNodeInit({ zclNode }) { 
