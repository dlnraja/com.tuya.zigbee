#!/usr/bin/env node
'use strict';

const { TuyaDriver } = require('homey-tuya');class TS0602_coverDriver extends TuyaDriver { async onInit() { this.log('TS0602_cover driver initialized'); } async onPairListDevices() { const devices = []; // Logique de dcouverte des appareils return devices; }}module.exports = TS0602_coverDriver;