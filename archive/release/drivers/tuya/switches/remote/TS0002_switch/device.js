#!/usr/bin/env node
'use strict';

const { TuyaDevice } = require('homey-tuya');class TS0002_switchDevice extends TuyaDevice { async onInit() { this.log('TS0002_switch device initialized'); // Configuration des capacités selon le type await this.setCapabilityValue('onoff', false); this.log('TS0002_switch device ready'); } async onSettings({ oldSettings, newSettings, changedKeys }) { this.log('TS0002_switch settings updated'); }}module.exports = TS0002_switchDevice;