#!/usr/bin/env node
'use strict';

const { TuyaDevice } = require('homey-tuya');class TS0602_coverDevice extends TuyaDevice { async onInit() { this.log('TS0602_cover device initialized'); // Configuration des capacits selon le type await this.setCapabilityValue('onoff', false); this.log('TS0602_cover device ready'); } async onSettings({ oldSettings, newSettings, changedKeys }) { this.log('TS0602_cover settings updated'); }}module.exports = TS0602_coverDevice;