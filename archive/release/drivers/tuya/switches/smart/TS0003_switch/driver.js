#!/usr/bin/env node
'use strict';

const { TuyaDriver } = require('homey-tuya');class TS0003_switchDriver extends TuyaDriver { async onInit() { this.log('TS0003_switch driver initialized'); } async onPairListDevices() { const devices = []; // Logique de découverte des appareils return devices; }}module.exports = TS0003_switchDriver;