#!/usr/bin/env node
'use strict';

const { TuyaDriver } = require('homey-tuya');class TS0002_switchDriver extends TuyaDriver { async onInit() { this.log('TS0002_switch driver initialized'); } async onPairListDevices() { const devices = []; // Logique de découverte des appareils return devices; }}module.exports = TS0002_switchDriver;