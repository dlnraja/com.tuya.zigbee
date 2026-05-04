'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WeatherStationOutdoorDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('Weather Station Outdoor driver v7.4.11 initialized');
  }

  async onPairListDevices() {
    return [];
  }
}

module.exports = WeatherStationOutdoorDriver;
