#!/usr/bin/env node
'use strict';

const { TuyaDevice } = require('homey-tuya');class Ts0601_motionDevice extends TuyaDevice { async onInit() { this.log('ts0601_motion device initialized'); // Configuration des capacités selon le type await this.setCapabilityValue('onoff', false); this.log('ts0601_motion device ready'); } async onSettings({ oldSettings, newSettings, changedKeys }) { this.log('ts0601_motion settings updated'); }}module.exports = Ts0601_motionDevice;