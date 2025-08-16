#!/usr/bin/env node
'use strict';

const { TuyaDriver } = require('homey-tuya');class TS0604_coverDriver extends TuyaDriver { async onInit() { this.log('TS0604_cover driver initialized'); } async onPairListDevices() { const devices = []; // Logique de découverte des appareils return devices; }}module.exports = TS0604_coverDriver;