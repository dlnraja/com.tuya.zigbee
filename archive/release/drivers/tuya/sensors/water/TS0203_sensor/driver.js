#!/usr/bin/env node
'use strict';

const { TuyaDriver } = require('homey-tuya');class TS0203_sensorDriver extends TuyaDriver { async onInit() { this.log('TS0203_sensor driver initialized'); } async onPairListDevices() { const devices = []; // Logique de découverte des appareils return devices; }}module.exports = TS0203_sensorDriver;