#!/usr/bin/env node
'use strict';

const { TuyaDevice } = require('homey-tuya');class TS0202_sensorDevice extends TuyaDevice { async onInit() { this.log('TS0202_sensor device initialized'); // Configuration des capacités selon le type await this.setCapabilityValue('measure_temperature', 0); this.log('TS0202_sensor device ready'); } async onSettings({ oldSettings, newSettings, changedKeys }) { this.log('TS0202_sensor settings updated'); }}module.exports = TS0202_sensorDevice;