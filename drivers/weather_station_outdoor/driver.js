'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class Driver extends ZigBeeDriver { onInit() { this.log('weather_station_outdoor driver init'); } }
module.exports = Driver;
