﻿const { Device } = require('homey');
'use strict'; const { Driver } = require('homey'); class SmartPlugDriver extends Driver { async onInit() { this.log('Smart Plug driver initialized'); } async onPairListDevices() { 

