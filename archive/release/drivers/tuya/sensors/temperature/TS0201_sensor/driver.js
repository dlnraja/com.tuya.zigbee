#!/usr/bin/env node
'use strict';

const { TuyaDriver } = require('homey-tuya');class TS0201_sensorDriver extends TuyaDriver { async onInit() { this.log('TS0201_sensor driver initialized'); } async onPairListDevices() { const devices = []; // Logique de découverte des appareils return devices; }}module.exports = TS0201_sensorDriver;