'use strict'; const { ZigBeeDevice } = require('homey-meshdriver'); class blindmotorDevice extends ZigBeeDevice { async onNodeInit({ zclNode }) { 
