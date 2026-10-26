'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

// P3068 exact-pair driver (VABRATE | Excellux, Excellux ZG-103V vibration sensor), moved out of the socket-class motion_sensor_switch.
class VibrationSensorExcelluxZg103vDriver extends ZigBeeDriver {}

module.exports = VibrationSensorExcelluxZg103vDriver;
