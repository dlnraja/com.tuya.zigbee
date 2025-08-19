#!/usr/bin/env node
'use strict';

const { TuyaDriver } = require('homey-tuya');class Ts0601_rgbDriver extends TuyaDriver { async onInit() { this.log('ts0601_rgb driver initialized'); } async onPairListDevices() { const devices = []; // Logique de découverte des appareils return devices; }}module.exports = Ts0601_rgbDriver;