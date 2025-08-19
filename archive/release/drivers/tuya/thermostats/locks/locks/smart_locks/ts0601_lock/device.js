#!/usr/bin/env node
'use strict';

const { TuyaDevice } = require('homey-tuya');class Ts0601_lockDevice extends TuyaDevice { async onInit() { this.log('ts0601_lock device initialized'); // Configuration des capacits selon le type await this.setCapabilityValue('onoff', false); this.log('ts0601_lock device ready'); } async onSettings({ oldSettings, newSettings, changedKeys }) { this.log('ts0601_lock settings updated'); }}module.exports = Ts0601_lockDevice;