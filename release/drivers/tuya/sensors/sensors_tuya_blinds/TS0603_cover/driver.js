#!/usr/bin/env node
'use strict';

const { TuyaDriver } = require('homey-tuya');class TS0603_coverDriver extends TuyaDriver { async onInit() { this.log('TS0603_cover driver initialized'); } async onPairListDevices() { const devices = []; // Logique de dcouverte des appareils return devices; }}module.exports = TS0603_coverDriver;