#!/usr/bin/env node
'use strict';

const { TuyaDevice } = require('homey-tuya');class Ts0602_thermostatDevice extends TuyaDevice { async onInit() { this.log('ts0602_thermostat device initialized'); // Configuration des capacités selon le type await this.setCapabilityValue('onoff', false); this.log('ts0602_thermostat device ready'); } async onSettings({ oldSettings, newSettings, changedKeys }) { this.log('ts0602_thermostat settings updated'); }}module.exports = Ts0602_thermostatDevice;