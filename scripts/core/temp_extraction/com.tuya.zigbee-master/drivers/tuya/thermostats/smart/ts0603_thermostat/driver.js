#!/usr/bin/env node
'use strict';

const { TuyaDriver } = require('homey-tuya');class Ts0603_thermostatDriver extends TuyaDriver { async onInit() { this.log('ts0603_thermostat driver initialized'); } async onPairListDevices() { const devices = []; // Logique de découverte des appareils return devices; }}module.exports = Ts0603_thermostatDriver;