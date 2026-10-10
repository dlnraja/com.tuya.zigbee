'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// #100 exact-pair driver: Tuya ZY-N1 USB sound level sensor. No existing driver exposes a dB level with a noise alarm.
class SoundSensorTuyaDriver extends ZigBeeDriver {}

module.exports = SoundSensorTuyaDriver;
