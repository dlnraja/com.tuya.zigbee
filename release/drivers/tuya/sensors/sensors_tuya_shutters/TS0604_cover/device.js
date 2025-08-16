#!/usr/bin/env node
'use strict';

const { TuyaDevice } = require('homey-tuya');class TS0604_coverDevice extends TuyaDevice { async onInit() { this.log('TS0604_cover device initialized'); // Configuration des capacits selon le type await this.setCapabilityValue('onoff', false); this.log('TS0604_cover device ready'); } async onSettings({ oldSettings, newSettings, changedKeys }) { this.log('TS0604_cover settings updated'); }}module.exports = TS0604_coverDevice;