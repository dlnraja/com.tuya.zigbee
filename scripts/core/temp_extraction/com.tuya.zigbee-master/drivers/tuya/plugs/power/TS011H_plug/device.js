#!/usr/bin/env node
'use strict';

const { TuyaDevice } = require('homey-tuya');class TS011H_plugDevice extends TuyaDevice { async onInit() { this.log('TS011H_plug device initialized'); // Configuration des capacités selon le type await this.setCapabilityValue('onoff', false); this.log('TS011H_plug device ready'); } async onSettings({ oldSettings, newSettings, changedKeys }) { this.log('TS011H_plug settings updated'); }}module.exports = TS011H_plugDevice;