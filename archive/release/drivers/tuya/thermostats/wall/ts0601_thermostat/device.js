#!/usr/bin/env node
'use strict';

const { TuyaDevice } = require('homey-tuya');class Ts0601_thermostatDevice extends TuyaDevice { async onInit() { this.log('ts0601_thermostat device initialized'); // Configuration des capacités selon le type await this.setCapabilityValue('onoff', false); this.log('ts0601_thermostat device ready'); } async onSettings({ oldSettings, newSettings, changedKeys }) { this.log('ts0601_thermostat settings updated'); }}module.exports = Ts0601_thermostatDevice;