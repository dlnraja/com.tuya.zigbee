'use strict'; const Homey = require('homey'); const { debug } = require('zigbee-clusters'); debug(true); class tuyazigbee extends Homey.App { onInit() { this.log('Tuya Zigbee app is running...'); 
