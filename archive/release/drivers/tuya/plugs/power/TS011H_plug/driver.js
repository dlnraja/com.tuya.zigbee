#!/usr/bin/env node
'use strict';

const { TuyaDriver } = require('homey-tuya');class TS011H_plugDriver extends TuyaDriver { async onInit() { this.log('TS011H_plug driver initialized'); } async onPairListDevices() { const devices = []; // Logique de découverte des appareils return devices; }}module.exports = TS011H_plugDriver;