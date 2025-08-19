#!/usr/bin/env node
'use strict';

const { TuyaDriver } = require('homey-tuya');class TS011F_plugDriver extends TuyaDriver { async onInit() { this.log('TS011F_plug driver initialized'); } async onPairListDevices() { const devices = []; // Logique de découverte des appareils return devices; }}module.exports = TS011F_plugDriver;