#!/usr/bin/env node
'use strict';

const { TuyaDriver } = require('homey-tuya');class Ts0602_lockDriver extends TuyaDriver { async onInit() { this.log('ts0602_lock driver initialized'); } async onPairListDevices() { const devices = []; // Logique de dcouverte des appareils return devices; }}module.exports = Ts0602_lockDriver;